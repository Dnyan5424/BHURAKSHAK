from ..config import REPORT_DISCLAIMER
def make_pdf(path,rows):
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import simpleSplit
    c=canvas.Canvas(path,pagesize=A4);W,H=A4;y=H-50;c.setFont("Helvetica-Bold",15);c.drawString(40,y,"BhuRakshak - Case Evidence Report");y-=26
    def line(t,f="Helvetica",sz=10):
        nonlocal y
        for l in simpleSplit(str(t),f,sz,W-80):
            if y<60:c.showPage();y=H-50
            c.setFont(f,sz);c.drawString(40,y,l);y-=sz+4
    for k,v in rows:line(f"{k}: {v}")
    y-=10;line(REPORT_DISCLAIMER,"Helvetica-Oblique",8);c.save()
