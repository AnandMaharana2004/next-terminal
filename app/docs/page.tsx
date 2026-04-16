import Link from "next/link";
import { apiDocsSections, apiReference } from "@/docs/openapi";

const methodStyles: Record<string, string> = {
  DELETE: "bg-rose-500/16 text-rose-200 ring-rose-400/25",
  GET: "bg-sky-500/16 text-sky-200 ring-sky-400/25",
  POST: "bg-emerald-500/16 text-emerald-200 ring-emerald-400/25",
};

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#061513_0%,#0b1f1d_18%,#081111_100%)] px-4 py-6 text-stone-100 sm:px-6 sm:py-8 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur sm:p-7 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-200/75">Swagger Docs</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Mobile API Reference</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300 sm:text-base">
                This project now exposes a Swagger-compatible OpenAPI spec for the chat, call, profile, and admin
                endpoints. Use the JSON directly in your mobile app tooling or keep this page open as a quick
                reference while building.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-medium text-[#06221c] transition hover:bg-emerald-300"
                href="/api/docs"
              >
                Open JSON spec
              </Link>
              <Link
                className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-stone-100 transition hover:bg-white/10"
                href="/"
              >
                Back to chat
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {apiDocsSections.map((section) => (
              <article key={section.title} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-medium text-white">{section.title}</p>
                <p className="mt-2 text-sm leading-6 text-stone-300">{section.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {apiReference.map((endpoint) => (
            <article
              key={`${endpoint.method}-${endpoint.path}`}
              className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0b1716]/90 shadow-[0_18px_60px_rgba(0,0,0,0.22)]"
            >
              <div className="border-b border-white/8 bg-white/5 px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.2em] ring-1 ${
                        methodStyles[endpoint.method] ?? "bg-white/10 text-white ring-white/10"
                      }`}
                    >
                      {endpoint.method}
                    </span>
                    <code className="overflow-x-auto text-sm text-stone-100 sm:text-[15px]">{endpoint.path}</code>
                  </div>
                  <span className="w-fit rounded-full bg-white/6 px-3 py-1 text-xs text-stone-300">
                    {endpoint.tag}
                  </span>
                </div>
                <p className="mt-3 text-sm text-stone-300">{endpoint.summary}</p>
              </div>

              <div className="grid gap-0 lg:grid-cols-2">
                <div className="border-b border-white/8 p-4 lg:border-b-0 lg:border-r sm:p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Request</p>
                  {endpoint.requestExample ? (
                    <pre className="mt-3 overflow-x-auto rounded-[18px] bg-black/30 p-4 text-xs leading-6 text-emerald-100">
                      {formatJson(endpoint.requestExample)}
                    </pre>
                  ) : (
                    <p className="mt-3 text-sm text-stone-400">No request body.</p>
                  )}
                </div>

                <div className="p-4 sm:p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Response</p>
                  <pre className="mt-3 overflow-x-auto rounded-[18px] bg-black/30 p-4 text-xs leading-6 text-sky-100">
                    {formatJson(endpoint.responseExample)}
                  </pre>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
