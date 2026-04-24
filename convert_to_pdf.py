import markdown
import re

MD_PATH = r"c:\Users\gshub\OneDrive\Desktop\platform\Dropout-main\Dropamyn_Project_Outline.md"
HTML_PATH = r"c:\Users\gshub\OneDrive\Desktop\platform\Dropout-main\Dropamyn_Project_Outline.html"

with open(MD_PATH, "r", encoding="utf-8") as f:
    md_text = f.read()

# Convert mermaid blocks to styled placeholder
md_text = re.sub(
    r'```mermaid\n(.*?)```',
    lambda m: '\n**[ER Diagram — see markdown source for the full Mermaid diagram]**\n',
    md_text,
    flags=re.DOTALL
)

# Convert to HTML
html_body = markdown.markdown(
    md_text,
    extensions=["tables", "fenced_code", "toc", "sane_lists"],
)

# Fix GitHub-style alerts
html_body = re.sub(r'\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]', r'<strong>⚠ \1:</strong>', html_body)

full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Dropamyn — Project Outline</title>
<style>
  @media print {{
    body {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
    h2, h3 {{ page-break-after: avoid; }}
    table, pre {{ page-break-inside: avoid; }}
    .cover {{ page-break-after: always; }}
  }}
  @page {{
    size: A4;
    margin: 18mm 16mm;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    color: #1e293b;
    line-height: 1.7;
    background: #fff;
    padding: 0;
  }}

  /* ---- COVER ---- */
  .cover {{
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    text-align: center;
    padding: 60px 40px;
  }}
  .cover h1 {{
    font-size: 48px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.03em;
    margin-bottom: 4px;
    border: none;
  }}
  .cover h1 span {{ color: #3b82f6; }}
  .cover .subtitle {{
    font-size: 16px;
    color: #3b82f6;
    font-weight: 500;
    margin-bottom: 16px;
  }}
  .cover .line {{
    width: 60px;
    height: 3px;
    background: #3b82f6;
    border-radius: 2px;
    margin: 0 auto 20px;
  }}
  .cover .tagline {{
    font-size: 13px;
    color: #64748b;
    font-style: italic;
    margin-bottom: 6px;
  }}
  .cover .meta-table {{
    margin-top: 40px;
    border-collapse: collapse;
    text-align: left;
    font-size: 12px;
  }}
  .cover .meta-table td {{
    padding: 5px 14px;
    border: none;
  }}
  .cover .meta-table td:first-child {{
    font-weight: 700;
    color: #334155;
    text-align: right;
  }}
  .cover .meta-table td:last-child {{
    color: #64748b;
  }}

  /* ---- CONTENT ---- */
  .content {{
    max-width: 100%;
    padding: 10px 30px;
  }}
  h1 {{
    color: #0f172a;
    font-size: 24px;
    font-weight: 700;
    border-bottom: 3px solid #3b82f6;
    padding-bottom: 8px;
    margin-top: 36px;
    margin-bottom: 18px;
  }}
  h2 {{
    color: #1e293b;
    font-size: 18px;
    font-weight: 600;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 6px;
    margin-top: 32px;
    margin-bottom: 14px;
  }}
  h3 {{
    color: #334155;
    font-size: 15px;
    font-weight: 600;
    margin-top: 22px;
    margin-bottom: 8px;
  }}
  h4 {{
    color: #475569;
    font-size: 13px;
    font-weight: 600;
    margin-top: 14px;
    margin-bottom: 6px;
  }}
  p {{
    margin: 8px 0;
  }}
  table {{
    border-collapse: collapse;
    width: 100%;
    margin: 14px 0;
    font-size: 11.5px;
  }}
  th {{
    background: #f1f5f9;
    color: #334155;
    text-align: left;
    padding: 9px 12px;
    border: 1px solid #cbd5e1;
    font-weight: 600;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }}
  td {{
    padding: 7px 12px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
  }}
  tr:nth-child(even) {{
    background: #f8fafc;
  }}
  code {{
    background: #f1f5f9;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 11px;
    color: #be123c;
    font-family: 'Cascadia Code', Consolas, 'Courier New', monospace;
  }}
  pre {{
    background: #0f172a;
    color: #e2e8f0;
    padding: 16px 18px;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 10.5px;
    line-height: 1.55;
    margin: 14px 0;
  }}
  pre code {{
    background: none;
    color: #e2e8f0;
    padding: 0;
    font-size: 10.5px;
  }}
  blockquote {{
    border-left: 3px solid #3b82f6;
    padding: 10px 16px;
    margin: 14px 0;
    background: #eff6ff;
    color: #1e40af;
    font-size: 11.5px;
    border-radius: 0 6px 6px 0;
  }}
  a {{
    color: #3b82f6;
    text-decoration: none;
  }}
  hr {{
    border: none;
    border-top: 1.5px solid #e2e8f0;
    margin: 28px 0;
  }}
  ul, ol {{
    margin: 8px 0;
    padding-left: 24px;
  }}
  li {{
    margin: 4px 0;
  }}
  li code {{
    font-size: 10.5px;
  }}
  strong {{
    color: #0f172a;
  }}
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <h1>Drop<span>amyn</span></h1>
  <div class="subtitle">Project Outline &amp; Architecture</div>
  <div class="line"></div>
  <div class="tagline">The All-in-One Social Discovery Platform for Product Launches</div>
  <div class="tagline">Sneakers &bull; Tech &bull; Streetwear &bull; Gaming &bull; AI Tools &bull; Creator Merch</div>
  <table class="meta-table">
    <tr><td>Version</td><td>0.1.0 (MVP)</td></tr>
    <tr><td>License</td><td>MIT</td></tr>
    <tr><td>Frontend</td><td>Next.js 16 + React 19 + TailwindCSS 4</td></tr>
    <tr><td>Backend</td><td>Express 5 + Prisma + PostgreSQL</td></tr>
    <tr><td>Deployed</td><td>Vercel (frontend) + Render (backend)</td></tr>
  </table>
</div>

<!-- CONTENT -->
<div class="content">
{html_body}
</div>

</body>
</html>"""

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(full_html)

print(f"HTML saved to: {HTML_PATH}")
print("Opening in browser for Print to PDF...")

import webbrowser
webbrowser.open(HTML_PATH)
print("Use Ctrl+P in the browser to save as PDF.")
