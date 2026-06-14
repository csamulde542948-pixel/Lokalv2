import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Clock, Flame, Search } from "lucide-react";
import { Link } from "react-router";
import { blogArticles, blogCategories, type BlogCategory } from "../features/blog/blog-data";

export function Blog() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<BlogCategory | "All">("All");
  const featured = blogArticles.find((article) => article.featured) ?? blogArticles[0];

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.getAttribute("content");
    document.title = "Lokalhost Blog | Guides for Indie Builders";
    description?.setAttribute(
      "content",
      "No-fluff guides, website roasts, launch notes, and survival tips for indie builders shipping on the internet."
    );
    const existingCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const previousCanonical = existingCanonical?.href;
    const canonical = existingCanonical ?? document.createElement("link");
    if (!existingCanonical) {
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = "https://lokalhost.club/blog";

    return () => {
      document.title = previousTitle;
      if (previousDescription) description?.setAttribute("content", previousDescription);
      if (existingCanonical && previousCanonical) {
        canonical.href = previousCanonical;
      } else {
        canonical.remove();
      }
    };
  }, []);

  const visibleArticles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return blogArticles.filter((article) => {
      const matchesCategory = category === "All" || article.category === category;
      const matchesSearch =
        !needle
        || `${article.title} ${article.excerpt} ${article.category}`.toLowerCase().includes(needle);
      return matchesCategory && matchesSearch;
    });
  }, [category, query]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground">
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase text-orange-500">
                <BookOpen className="h-4 w-4" />
                Builder survival guide
              </div>
              <h1 className="text-4xl font-black leading-tight sm:text-5xl">Lokalhost Blog</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                No-fluff guides, roasts, launch notes, and survival tips for indie builders
                shipping on the internet.
              </p>
            </div>
            <label className="relative block">
              <span className="sr-only">Search blog articles</span>
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search guides, roasts, launch tips..."
                className="h-12 w-full border border-border bg-card pl-11 pr-4 text-sm outline-none transition-colors focus:border-orange-500"
              />
            </label>
          </div>

          <div className="mt-8 flex max-w-full gap-2 overflow-x-auto pb-1">
            {blogCategories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={`whitespace-nowrap border px-3 py-2 text-xs font-semibold transition-colors ${
                  category === item
                    ? "border-orange-500 bg-orange-500 text-black"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      {!query && category === "All" && (
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
            <Link
              to={`/blog/${featured.slug}`}
              className="group relative min-h-[430px] overflow-hidden border-b border-border lg:border-b-0 lg:border-r"
            >
              <img
                src={featured.image}
                alt={featured.imageAlt}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-black/45" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                <span className="bg-orange-500 px-2 py-1 font-mono text-[10px] font-bold uppercase text-black">
                  Featured / {featured.category}
                </span>
                <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
                  {featured.title}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">{featured.excerpt}</p>
                <div className="mt-5 flex items-center gap-4 text-xs text-white/65">
                  <span>{featured.author}</span>
                  <span>{featured.readTime}</span>
                </div>
              </div>
            </Link>

            <div className="flex flex-col justify-between bg-card p-6 sm:p-8">
              <div>
                <p className="font-mono text-xs font-bold uppercase text-orange-500">From the field</p>
                <h2 className="mt-3 text-2xl font-black">Build fast. Learn faster. Ship less nonsense.</h2>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Practical notes from product roasts, community launches, and the messy work between
                  an idea and a project people can actually understand.
                </p>
              </div>
              <div className="mt-10 border-t border-border pt-6">
                <p className="text-sm font-semibold">Need feedback before launch?</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Let Loki inspect the page before strangers do it less politely.
                </p>
                <Link
                  to="/roast"
                  className="mt-5 inline-flex items-center gap-2 bg-orange-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-orange-400"
                >
                  <Flame className="h-4 w-4" />
                  Submit your project
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="mb-7 flex items-end justify-between border-b border-border pb-4">
            <div>
              <p className="font-mono text-xs uppercase text-muted-foreground">Latest field notes</p>
              <h2 className="mt-1 text-2xl font-black">
                {query || category !== "All" ? "Search results" : "Read before you ship"}
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">{visibleArticles.length} articles</span>
          </div>

          {visibleArticles.length > 0 ? (
            <div className="grid gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
              {visibleArticles.map((article) => (
                <Link key={article.slug} to={`/blog/${article.slug}`} className="group block">
                  <div className="aspect-[16/10] overflow-hidden border border-border bg-muted">
                    <img
                      src={article.image}
                      alt={article.imageAlt}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="pt-4">
                    <div className="flex items-center gap-3 font-mono text-[10px] uppercase text-muted-foreground">
                      <span className="font-bold text-orange-500">{article.category}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {article.readTime}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-black leading-snug group-hover:text-orange-500">
                      {article.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {article.excerpt}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                      <span className="text-muted-foreground">{article.publishedAt}</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        Read guide <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-border px-6 py-16 text-center">
              <p className="font-semibold">No field notes match that search.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("All");
                }}
                className="mt-3 text-sm font-semibold text-orange-500 hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
