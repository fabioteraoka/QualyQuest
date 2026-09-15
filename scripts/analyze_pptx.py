import zipfile
import xml.etree.ElementTree as ET
import sys
import os

EMU_PER_INCH = 914400.0

NS = {
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}

def analyze_pptx(filename):
    print(f"==================================================")
    print(f"🔍 ANALISANDO PPTX REAL GERADO: {filename}")
    print(f"==================================================")
    
    if not os.path.exists(filename):
        print(f"Arquivo não encontrado: {filename}")
        return False

    with zipfile.ZipFile(filename, 'r') as z:
        # 1. Slide Size
        pres_xml = ET.fromstring(z.read('ppt/presentation.xml'))
        sld_sz = pres_xml.find('.//p:sldSz', NS)
        if sld_sz is not None:
            sw = int(sld_sz.attrib['cx']) / EMU_PER_INCH
            sh = int(sld_sz.attrib['cy']) / EMU_PER_INCH
            print(f"Dimensões do Slide: {sw:.3f}\" x {sh:.3f}\" (Widescreen 16:9)")
        else:
            sw, sh = 13.333, 7.50

        # Safe boundaries
        safe_left = 0.80
        safe_right = 12.533
        safe_top = 1.35
        safe_bottom = 6.85
        footer_top = 7.00

        slide_names = [f for f in z.namelist() if f.startswith('ppt/slides/slide') and f.endswith('.xml')]
        # Sort slides numerically
        def slide_num(name):
            base = os.path.basename(name)
            num_str = base.replace('slide', '').replace('.xml', '')
            return int(num_str) if num_str.isdigit() else 999
        slide_names.sort(key=slide_num)

        total_violations = 0
        violations_by_slide = {}

        for sname in slide_names:
            s_num = slide_num(sname)
            s_xml = ET.fromstring(z.read(sname))
            
            is_cover = (s_num == 1)
            violations = []

            # Find all sp (shapes), graphicFrame (tables/charts), pic (images)
            for elem in s_xml.findall('.//p:sp', NS) + s_xml.findall('.//p:graphicFrame', NS) + s_xml.findall('.//p:pic', NS):
                # find xfrm
                xfrm = elem.find('.//a:xfrm', NS)
                if xfrm is None:
                    xfrm = elem.find('.//p:xfrm', NS)
                if xfrm is None:
                    continue

                off = xfrm.find('a:off', NS)
                ext = xfrm.find('a:ext', NS)
                if off is None or ext is None:
                    continue

                x = int(off.attrib['x']) / EMU_PER_INCH
                y = int(off.attrib['y']) / EMU_PER_INCH
                w = int(ext.attrib['cx']) / EMU_PER_INCH
                h = int(ext.attrib['cy']) / EMU_PER_INCH

                right = x + w
                bottom = y + h

                # Text content preview
                texts = [t.text for t in elem.findall('.//a:t', NS) if t.text]
                text_preview = " ".join(texts)[:40] if texts else ""

                # Check element type / purpose
                # Decorative top bar: y=0, h<=0.3
                is_top_bar = (y <= 0.05 and h <= 0.3)
                # Header texts: y <= 1.35 and h <= 0.5
                is_header = (y <= 1.35 and is_cover is False and not is_top_bar)
                # Footer texts: y >= 6.95
                is_footer = (y >= 6.95)

                # Cover slide has its own layout
                if is_cover:
                    # Check if anything goes past physical slide
                    if right > sw + 0.05:
                        violations.append(f"Capa: elemento ultrapassa borda direita ({right:.2f}\" > {sw:.2f}\") [{text_preview}]")
                    if bottom > sh + 0.05:
                        violations.append(f"Capa: elemento ultrapassa borda inferior ({bottom:.2f}\" > {sh:.2f}\") [{text_preview}]")
                    continue

                # Normal content slides:
                # 1. Physical slide overflow (strictly fatal)
                if right > sw + 0.02:
                    violations.append(f"EXTREMO: Ultrapassa largura física do slide ({right:.2f}\" > {sw:.2f}\") [{text_preview}]")
                if bottom > sh + 0.02:
                    violations.append(f"EXTREMO: Ultrapassa altura física do slide ({bottom:.2f}\" > {sh:.2f}\") [{text_preview}]")

                # 2. Check content elements (not header, not footer, not top bar)
                if not is_top_bar and not is_header and not is_footer:
                    if y < safe_top - 0.05:
                        violations.append(f"Invade cabeçalho (y={y:.2f}\" < {safe_top:.2f}\") [{text_preview}]")
                    if bottom > safe_bottom + 0.05:
                        if bottom > footer_top:
                            violations.append(f"COLISÃO COM RODAPÉ: bottom={bottom:.2f}\" > footer_top={footer_top:.2f}\" [{text_preview}]")
                        else:
                            violations.append(f"Invade margem de segurança do rodapé (bottom={bottom:.2f}\" > safe_bottom={safe_bottom:.2f}\") [{text_preview}]")
                    if x < safe_left - 0.05:
                        violations.append(f"Invade margem esquerda (x={x:.2f}\" < {safe_left:.2f}\") [{text_preview}]")
                    if right > safe_right + 0.05:
                        violations.append(f"Invade margem direita (right={right:.2f}\" > safe_right={safe_right:.2f}\") [{text_preview}]")

                # Table specific deep inspection
                tbl = elem.find('.//a:tbl', NS)
                if tbl is not None:
                    rows = tbl.findall('a:tr', NS)
                    total_tbl_h = sum(int(r.attrib.get('h', '0')) / EMU_PER_INCH for r in rows)
                    tbl_bottom = y + total_tbl_h
                    if tbl_bottom > safe_bottom + 0.05:
                        violations.append(f"TABELA: Altura acumulada de linhas ({total_tbl_h:.2f}\") leva tabela além do safe_bottom ({tbl_bottom:.2f}\" > {safe_bottom:.2f}\") [{len(rows)} linhas]")

            if violations:
                violations_by_slide[s_num] = violations
                total_violations += len(violations)
                print(f"❌ Slide {s_num:02d}: {len(violations)} infração(ões) detectada(s):")
                for v in violations:
                    print(f"     - {v}")
            else:
                print(f"✅ Slide {s_num:02d}: OK (Todos os elementos dentro da Safe Area)")

        print(f"\n--------------------------------------------------")
        if total_violations == 0:
            print(f"🎉 HOMOLOGAÇÃO TOTAL DO PPTX REAL: 0 INFRAÇÕES EM {len(slide_names)} SLIDES!")
            return True
        else:
            print(f"⚠️  RESULTADO: {total_violations} INFRAÇÃO(ÕES) ENCONTRADA(S) EM {len(violations_by_slide)} SLIDE(S).")
            return False

if __name__ == '__main__':
    filename = sys.argv[1] if len(sys.argv) > 1 else 'output_test.pptx'
    success = analyze_pptx(filename)
    sys.exit(0 if success else 1)
