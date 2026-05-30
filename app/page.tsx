export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-cyan-300">
          LingQi
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
          AI Pull Request review reports for GitHub PRs.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Enter a GitHub Pull Request URL, fetch the code changes, and generate
          a structured report with summaries, risk findings, review suggestions,
          and context notes.
        </p>
        <div className="mt-10 rounded-lg border border-slate-800 bg-slate-900/70 p-5">
          <label
            className="mb-2 block text-sm font-medium text-slate-200"
            htmlFor="pr-url"
          >
            GitHub Pull Request URL
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="min-h-11 flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 text-slate-100 outline-none transition focus:border-cyan-300"
              id="pr-url"
              placeholder="https://github.com/owner/repo/pull/123"
              type="url"
            />
            <button
              className="min-h-11 rounded-md bg-cyan-300 px-5 font-semibold text-slate-950 transition hover:bg-cyan-200"
              type="button"
            >
              Analyze
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Initial project scaffold. PR analysis will be added in follow-up
            changes.
          </p>
        </div>
      </section>
    </main>
  );
}
