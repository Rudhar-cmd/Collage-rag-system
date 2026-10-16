#!/usr/bin/env python3
"""
MIET Jammu public-site crawler for College AI.
- Respects robots.txt (best effort via urllib.robotparser)
- Stays on mietjmu.in and www.mietjmu.in
- Reads sitemap URLs when available and discovers same-site links
- Saves per-page Markdown/text, source metadata, PDFs, category PDFs, and a manifest
- Does not log in, bypass restrictions, or submit forms
"""
from __future__ import annotations
import argparse, hashlib, json, os, re, time, urllib.robotparser
from collections import deque, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag, urlunparse
import requests
from bs4 import BeautifulSoup
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm

BASE_URL = "https://mietjmu.in/"
ALLOWED_HOSTS = {"mietjmu.in", "www.mietjmu.in"}
USER_AGENT = "CollegeAI-MIET-ResearchBot/1.0 (educational indexing; contact site administrator if needed)"
DEFAULT_DELAY = 1.0
MAX_PAGES_DEFAULT = 500
TIMEOUT = 20
SKIP_EXTENSIONS = (".jpg",".jpeg",".png",".gif",".webp",".svg",".zip",".mp4",".mp3",".css",".js",".ico",".woff",".woff2",".ttf")
CATEGORY_RULES = {
    "admissions_fees_scholarships": ["admission", "apply", "fee", "scholarship", "eligib", "how-to-apply", "tuition"],
    "programmes_departments": ["program", "course", "undergraduate", "postgraduate", "btech", "mtech", "mba", "mca", "bca", "department", "school-of"],
    "research_innovation": ["research", "innovation", "patent", "grant", "crie", "centre", "center", "lab", "incub"],
    "placements_industry": ["placement", "career", "recruit", "industry", "industrial", "internship"],
    "student_services_campus": ["student", "hostel", "transport", "library", "sports", "club", "facility", "campus", "grievance", "anti-ragging", "counselling"],
    "news_events": ["news", "event", "blog", "achievement", "alumni", "newsletter"],
    "academics_examinations": ["academic", "calendar", "exam", "controller", "ordinance", "regulation", "attendance", "result"],
}
GENERIC_CATEGORY = "college_information"

def canonicalize(url: str) -> str | None:
    try:
        u = urlparse(url)
        if u.scheme not in ("http", "https") or u.hostname not in ALLOWED_HOSTS:
            return None
        path = re.sub(r"/+", "/", u.path or "/")
        # drop common tracking parameters and fragments
        query_pairs = []
        for pair in u.query.split("&") if u.query else []:
            k = pair.split("=",1)[0].lower()
            if k and not (k.startswith("utm_") or k in {"fbclid","gclid","ref"}):
                query_pairs.append(pair)
        query = "&".join(sorted(set(query_pairs)))
        host = "mietjmu.in"
        return urlunparse(("https",host,path,"",query,""))
    except Exception:
        return None

def category_for(url: str, title: str = "") -> str:
    haystack = (url + " " + title).lower()
    for category, terms in CATEGORY_RULES.items():
        if any(term in haystack for term in terms):
            return category
    return GENERIC_CATEGORY

def safe_name(s: str, max_len: int=100) -> str:
    s = re.sub(r"[^a-zA-Z0-9._-]+", "_", s).strip("._-")
    return (s or "page")[:max_len]

def page_text(soup: BeautifulSoup) -> tuple[str,str]:
    for tag in soup(["script","style","noscript","svg","nav","footer","header","form"]):
        tag.decompose()
    main = soup.find("main") or soup.find("article") or soup.find(id=re.compile(r"content|main", re.I)) or soup.body or soup
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    h1 = main.find(["h1","h2"])
    if h1 and not title: title = h1.get_text(" ", strip=True)
    chunks=[]
    for el in main.find_all(["h1","h2","h3","h4","p","li","tr","dt","dd"], recursive=True):
        txt=" ".join(el.get_text(" ", strip=True).split())
        if not txt: continue
        if el.name.startswith("h"):
            chunks.append("\n" + "#" * min(int(el.name[1]),4) + " " + txt)
        elif el.name=="li":
            chunks.append("- " + txt)
        else:
            chunks.append(txt)
    # de-duplicate repeated adjacent lines, preserving order
    dedup=[]; previous=None
    for line in chunks:
        if line != previous: dedup.append(line)
        previous=line
    return title.strip(), "\n\n".join(dedup).strip()

def fetch_sitemap(session, root, rp, delay):
    urls=[]
    candidates=[urljoin(root,"sitemap_index.xml"),urljoin(root,"sitemap.xml")]
    for sm in candidates:
        try:
            if not rp.can_fetch(USER_AGENT, sm): continue
            r=session.get(sm,timeout=TIMEOUT)
            if r.status_code!=200 or "<url" not in r.text: continue
            soup=BeautifulSoup(r.text,"xml")
            locs=[x.get_text(strip=True) for x in soup.find_all("loc")]
            # handle sitemap indexes one level deep
            for loc in locs:
                if loc.lower().endswith(".xml"):
                    try:
                        time.sleep(delay)
                        rr=session.get(loc,timeout=TIMEOUT)
                        if rr.status_code==200:
                            ss=BeautifulSoup(rr.text,"xml")
                            urls.extend(x.get_text(strip=True) for x in ss.find_all("loc"))
                    except requests.RequestException: pass
                else: urls.append(loc)
            if urls: break
        except requests.RequestException: pass
    return urls

def extract_links(soup, current):
    found=[]
    for a in soup.find_all("a",href=True):
        href=a["href"].strip()
        if not href or href.startswith(("mailto:","tel:","javascript:")): continue
        absolute=urljoin(current,href)
        if absolute.lower().split("?")[0].endswith(".pdf"):
            found.append(("pdf",absolute))
        else:
            c=canonicalize(absolute)
            if c and not urlparse(c).path.lower().endswith(SKIP_EXTENSIONS):
                found.append(("page",c))
    return found

def pdf_text(path):
    try:
        from pypdf import PdfReader
        reader=PdfReader(str(path))
        return "\n\n".join((p.extract_text() or "") for p in reader.pages).strip()
    except Exception:
        return ""

def build_topic_pdfs(pages, out_dir):
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    styles=getSampleStyleSheet()
    styles.add(ParagraphStyle(name="TopicTitle",parent=styles["Title"],fontSize=17,leading=21,textColor=colors.HexColor("#183153"),alignment=1,spaceAfter=8))
    styles.add(ParagraphStyle(name="TopicH",parent=styles["Heading2"],fontSize=11,leading=14,textColor=colors.HexColor("#244c70"),spaceBefore=8,spaceAfter=4))
    styles.add(ParagraphStyle(name="TopicBody",parent=styles["BodyText"],fontSize=8.5,leading=11,spaceAfter=4))
    styles.add(ParagraphStyle(name="TopicSmall",parent=styles["BodyText"],fontSize=7,leading=9,textColor=colors.HexColor("#657080"),spaceAfter=4))
    groups=defaultdict(list)
    for p in pages: groups[p["category"]].append(p)
    for cat, entries in groups.items():
        path=out_dir/"pdf"/f"{cat}.pdf"
        path.parent.mkdir(parents=True,exist_ok=True)
        story=[Paragraph("MIET Jammu — "+cat.replace("_"," ").title(),styles["TopicTitle"]),
               Paragraph("Automatically collected public website reference. Check the source URL and current official notices before relying on time-sensitive details.",styles["TopicSmall"])]
        for p in sorted(entries,key=lambda x:x["url"]):
            story.append(Paragraph(p["title"] or p["url"],styles["TopicH"]))
            story.append(Paragraph("Source: <link href='"+p["url"]+"' color='blue'>"+p["url"]+"</link> | Crawled: "+p["crawled_at"],styles["TopicSmall"]))
            content=(p["text"] or "No extractable text found. Visit the source URL.")[:30000]
            for block in re.split(r"\n\s*\n",content):
                block=block.strip()
                if block:
                    escaped=(block.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;"))
                    escaped=re.sub(r"\n","<br/>",escaped)
                    story.append(Paragraph(escaped,styles["TopicBody"]))
            story.append(Spacer(1,6))
        def footer(canvas, doc):
            canvas.saveState(); canvas.setFont("Helvetica",7); canvas.setFillColor(colors.grey)
            canvas.drawString(17*mm,7*mm,"MIET Jammu | Auto-collected public-site reference")
            canvas.drawRightString(A4[0]-17*mm,7*mm,f"Page {doc.page}"); canvas.restoreState()
        SimpleDocTemplate(str(path),pagesize=A4,rightMargin=17*mm,leftMargin=17*mm,topMargin=15*mm,bottomMargin=15*mm,title=f"MIET {cat}").build(story,onFirstPage=footer,onLaterPages=footer)

def main():
    parser=argparse.ArgumentParser(description="Crawl public MIET Jammu pages and build PDFs + RAG text")
    parser.add_argument("--start-url",default=BASE_URL)
    parser.add_argument("--max-pages",type=int,default=MAX_PAGES_DEFAULT)
    parser.add_argument("--delay",type=float,default=DEFAULT_DELAY)
    parser.add_argument("--out",default="data/miet_crawl")
    args=parser.parse_args()
    out=Path(args.out).resolve()
    (out/"text").mkdir(parents=True,exist_ok=True)
    (out/"pdf").mkdir(parents=True,exist_ok=True)
    (out/"downloaded_pdfs").mkdir(parents=True,exist_ok=True)
    session=requests.Session()
    session.headers.update({"User-Agent":USER_AGENT})
    root="https://mietjmu.in/"
    rp=urllib.robotparser.RobotFileParser()
    rp.set_url(urljoin(root,"robots.txt"))
    try:
        rr=session.get(rp.url,timeout=TIMEOUT)
        if rr.status_code==200:
            rp.parse(rr.text.splitlines())
        else:
            print(f"robots.txt returned {rr.status_code}; crawling will be conservative.")
            rp.parse([])
    except requests.RequestException as e:
        print(f"Could not read robots.txt ({e}); stopping to avoid ignoring site policy.")
        return
    seeds=[canonicalize(args.start_url) or canonicalize(root)]
    seeds += [u for u in fetch_sitemap(session,root,rp,args.delay) if canonicalize(u)]
    queue=deque(dict.fromkeys(seeds))
    seen=set(); pages=[]; pdf_manifest=[]; errors=[]
    crawled_at=datetime.now(timezone.utc).isoformat()
    while queue and len(seen)<args.max_pages:
        url=queue.popleft()
        if not url or url in seen: continue
        seen.add(url)
        if not rp.can_fetch(USER_AGENT,url):
            print("ROBOTS BLOCKED:",url); continue
        try:
            response=session.get(url,timeout=TIMEOUT,allow_redirects=True)
            time.sleep(max(args.delay,0))
            if response.status_code>=400:
                errors.append({"url":url,"error":f"HTTP {response.status_code}"}); continue
            ctype=response.headers.get("content-type","").lower()
            if "pdf" in ctype or url.lower().endswith(".pdf"):
                filename=safe_name(Path(urlparse(url).path).name or "document.pdf")
                if not filename.lower().endswith(".pdf"): filename += ".pdf"
                path=out/"downloaded_pdfs"/(hashlib.sha1(url.encode()).hexdigest()[:8]+"_"+filename)
                path.write_bytes(response.content)
                text=pdf_text(path)
                pdf_manifest.append({"url":url,"file":str(path.relative_to(out)),"text_chars":len(text),"crawled_at":crawled_at})
                if text:
                    stem=safe_name(Path(filename).stem)
                    (out/"text"/(stem+".txt")).write_text(f"TITLE: {filename}\nSOURCE_URL: {url}\nCRAWLED_AT: {crawled_at}\n\n{text}",encoding="utf-8")
                print("PDF:",url); continue
            if "html" not in ctype and not response.text.lstrip().startswith("<"):
                continue
            soup=BeautifulSoup(response.text,"html.parser")
            title,text=page_text(BeautifulSoup(response.text,"html.parser"))
            if len(text)<80:
                # skip mostly empty shells, but still discover links
                pass
            category=category_for(url,title)
            item={"url":url,"title":title or url,"category":category,"text":text,"crawled_at":crawled_at}
            if text:
                pages.append(item)
                filename=hashlib.sha1(url.encode()).hexdigest()[:12]+"_"+safe_name(title or "page")+".md"
                md=f"# {item['title']}\n\nSOURCE_URL: {url}\nCATEGORY: {category}\nCRAWLED_AT: {crawled_at}\n\n{text}\n"
                (out/"text"/filename).write_text(md,encoding="utf-8")
            for typ,link in extract_links(soup,url):
                if typ=="page" and link not in seen: queue.append(link)
                elif typ=="pdf" and link not in seen: queue.append(link)
            print(f"[{len(seen)}/{args.max_pages}] {response.status_code} {category} {url}")
        except (requests.RequestException,ValueError) as e:
            errors.append({"url":url,"error":str(e)})
            print("ERROR:",url,e)
    (out/"manifest.json").write_text(json.dumps({"site":root,"crawled_at":crawled_at,"page_count":len(pages),"pdf_count":len(pdf_manifest),"pages":[{k:v for k,v in p.items() if k!="text"} for p in pages],"pdfs":pdf_manifest,"errors":errors},indent=2,ensure_ascii=False),encoding="utf-8")
    (out/"pages.jsonl").write_text("".join(json.dumps(p,ensure_ascii=False)+"\n" for p in pages),encoding="utf-8")
    build_topic_pdfs(pages,out)
    print("\nDONE")
    print(f"HTML pages extracted: {len(pages)}")
    print(f"PDFs downloaded: {len(pdf_manifest)}")
    print(f"Output directory: {out}")
    print("Review manifest.json and the PDFs before indexing. The crawler does not verify factual accuracy or interpret scanned PDFs without OCR.")

if __name__=="__main__":
    main()
