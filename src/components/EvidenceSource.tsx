import { Download, FileText, ArrowUpRight } from "lucide-react";
import { documents, gallery } from "../data/network";
import { uiCopy } from "../i18n";
import { useNetworkStore } from "../store/useNetworkStore";

const docAr: Record<string, { title: string; text: string; date: string; source: string }> = {
  "/documents/basis-of-design-2022.pdf": {
    title: "أسس تصميم شبكة أبوظبي للدراجات",
    text: "مبادئ التخطيط، فئات المستخدمين، أنواع المسارات، معايير التصميم، مراحل العمل، ومؤشرات المنفعة.",
    date: "يوليو 2022",
    source: "أسس التصميم"
  },
  "/documents/progress-status-dec-2025.pdf": {
    title: "حالة تقدم مشروع مسار أبوظبي للدراجات",
    text: "تقدم الحزم، المقاولون، المسافة المخططة، الأسفلت المنجز، تقدم الإنشاء، التوقعات، والأعمال الإنشائية.",
    date: "ديسمبر 2025",
    source: "حالة التقدم"
  }
};

const galleryAr: Record<string, string> = {
  "Network route map": "خريطة محاور الشبكة",
  "Design principles board": "لوحة مبادئ التصميم",
  "Project highlights": "أبرز نتائج المشروع",
  "Track 3 and Track 4 progress": "تقدم المسارين 3 و4"
};

export function EvidenceSource() {
  const locale = useNetworkStore((state) => state.locale);
  const c = uiCopy[locale];

  return (
    <section id="evidence" className="evidence-shell">
      <div className="evidence-head">
        <p className="eyebrow">{c.sourceEyebrow}</p>
        <h2>{c.sourceTitle}</h2>
        <p>{c.sourceText}</p>
      </div>

      <div className="evidence-docs">
        {documents.map((doc) => {
          const ar = docAr[doc.href];
          const title = locale === "ar" && ar ? ar.title : doc.title;
          const text = locale === "ar" && ar ? ar.text : doc.text;
          const date = locale === "ar" && ar ? ar.date : doc.date;
          const source = locale === "ar" && ar ? ar.source : doc.source;
          return (
            <article className="evidence-doc" key={doc.href}>
              <div className="evidence-doc-icon">
                <FileText className="h-6 w-6" />
              </div>
              <p className="evidence-doc-meta">{date} · {source}</p>
              <h3>{title}</h3>
              <p className="evidence-doc-text">{text}</p>
              <div className="evidence-doc-actions">
                <a className="button" href={doc.href} target="_blank" rel="noreferrer">
                  {c.openPdf} <ArrowUpRight className="h-4 w-4" />
                </a>
                <a className="icon-button" href={doc.href} download aria-label={`${c.download} — ${title}`}>
                  <Download className="h-4 w-4" />
                </a>
              </div>
            </article>
          );
        })}
      </div>

      <p className="evidence-gallery-label">{c.reportImagery}</p>
      <div className="evidence-gallery">
        {gallery.map((item) => (
          <a
            className="evidence-shot"
            key={item.title}
            href={item.image}
            target="_blank"
            rel="noreferrer"
            aria-label={`${c.viewImage} — ${item.title}`}
          >
            <img src={item.image} alt={item.title} loading="lazy" />
            <div className="evidence-shot-overlay">
              <span>{item.tag}</span>
              <strong>{locale === "ar" ? galleryAr[item.title] ?? item.title : item.title}</strong>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
