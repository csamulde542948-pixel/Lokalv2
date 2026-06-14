import { useEffect } from "react";
import { ArrowLeft, Clock, Flame } from "lucide-react";
import { Link, Navigate, useParams } from "react-router";
import { getBlogArticle } from "../features/blog/blog-data";

export function BlogArticle() {
  const { slug } = useParams();
  const article = getBlogArticle(slug);

  useEffect(() => {
    if (!article) return;

    const previousTitle = document.title;
    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.getAttribute("content");
    document.title = `${article.title} | Lokalhost Blog`;
    description?.setAttribute("content", article.excerpt);
    const existingCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const previousCanonical = existingCanonical?.href;
    const canonical = existingCanonical ?? document.createElement("link");
    if (!existingCanonical) {
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `https://lokalhost.club/blog/${article.slug}`;
    const structuredData = document.createElement("script");
    structuredData.type = "application/ld+json";
    structuredData.dataset.lokalBlogSchema = "true";
    structuredData.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      description: article.excerpt,
      image: `https://lokalhost.club${article.image}`,
      datePublished: "2026-06-14",
      dateModified: "2026-06-14",
      author: {
        "@type": "Organization",
        name: article.author,
      },
      publisher: {
        "@type": "Organization",
        name: "Lokalhost.club",
        url: "https://lokalhost.club",
      },
      mainEntityOfPage: `https://lokalhost.club/blog/${article.slug}`,
    });
    document.head.appendChild(structuredData);

    return () => {
      document.title = previousTitle;
      if (previousDescription) description?.setAttribute("content", previousDescription);
      if (existingCanonical && previousCanonical) {
        canonical.href = previousCanonical;
      } else {
        canonical.remove();
      }
      structuredData.remove();
    };
  }, [article]);

  if (!article) return <Navigate to="/blog" replace />;

  return (
    <article className="min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            All field notes
          </Link>
          <p className="mt-8 font-mono text-xs font-bold uppercase text-orange-500">{article.category}</p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">{article.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{article.excerpt}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>{article.author}</span>
            <span>{article.publishedAt}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {article.readTime}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <img
          src={article.image}
          alt={article.imageAlt}
          className="aspect-[16/8] w-full border border-border object-cover"
        />
      </div>

      <div className="mx-auto grid max-w-5xl gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <section className="border-l-4 border-orange-500 bg-card px-5 py-5">
            <p className="font-mono text-xs font-bold uppercase text-orange-500">Short answer</p>
            <p className="mt-2 text-base leading-7">{article.shortAnswer}</p>
          </section>

          <section className="mt-8 border-b border-border pb-8">
            <h2 className="text-xl font-black">Who this is for</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{article.audience}</p>
          </section>

          {article.sections.map((section) => (
            <section key={section.heading} className="border-b border-border py-8">
              <h2 className="text-2xl font-black leading-tight">{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-base leading-8 text-muted-foreground">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-5 space-y-3">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 leading-7 text-muted-foreground">
                      <span className="mt-3 h-1.5 w-1.5 flex-none bg-orange-500" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <aside className="h-fit border-t border-border pt-5 lg:sticky lg:top-24">
          <p className="font-mono text-[10px] font-bold uppercase text-muted-foreground">Next action</p>
          <p className="mt-3 text-sm font-semibold">Think the project is ready?</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Run the landing page through Loki and find out what you missed.
          </p>
          <Link
            to="/roast"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-orange-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-orange-400"
          >
            <Flame className="h-4 w-4" />
            Get roasted
          </Link>
        </aside>
      </div>
    </article>
  );
}
