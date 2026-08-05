## Running this site locally

You have two ways to run this project: with [Docker](https://docs.docker.com/get-started/), or directly
with [bun](https://bun.sh/docs) installed on your system.

### Option A: with Docker

1. Install [Docker](https://docs.docker.com/get-started/) (or [OrbStack](https://docs.orbstack.dev/) as a macOS
   alternative) and make sure it's running.
2. Clone the repository:

   ```bash
   git clone git@github.com:LucaPipolo/lcp-web.git && cd lcp-web
   ```

3. Make `.test` domains resolve to your machine (I suggest using [dnsmasq](https://formulae.brew.sh/formula/dnsmasq)).
4. Run the setup script and open the site:

   ```bash
   ./scripts/setup.sh
   ```

5. Visit **https://lcp-web.test**.

The dev server is already running with hot reload with [Vite](https://vite.dev/), so any change you make is reflected
straight away; there's nothing extra to start.

> [!CAUTION]
> The Docker scripts in this repo (`scripts/*.sh`) currently only support macOS.

> [!NOTE]
> On the first run, macOS asks for your password once, to trust the SSL certificate.

#### Commands you'll use day to day

| Command              | What it does                                     |
|----------------------|--------------------------------------------------|
| `./scripts/up.sh`    | Start this checkout                              |
| `./scripts/down.sh`  | Stop it, and the router if nothing else uses it  |
| `./scripts/setup.sh` | Rewrite `.env`, then start. Safe to run any time |

All three accept `--verbose` (or `-v`) for full output instead of one line per step.

To run project scripts, use `docker exec` against the app container:

```bash
docker exec lcp-web-app-1 bun run dev       # dev server
docker exec lcp-web-app-1 bun run build     # production build
docker exec lcp-web-app-1 bun run preview   # preview the build
```

#### **Built for git worktrees**

The Docker setup is designed around [git worktrees](https://git-scm.com/docs/git-worktree): each worktree gets its own
containers, port, and domain, so they never collide.

```bash
git worktree add ../my-feature
cd ../my-feature
./scripts/setup.sh
```

That checkout is now served at **https://my-feature.lcp-web.test**, alongside `lcp-web.test` and any other worktree,
each running at the same time without conflicts. A single shared router handles HTTPS for all of them; `down.sh` only
stops that router once nothing else is using it.

This makes the project a good fit for working with multiple AI agents or an ADE like [Orca](https://www.onorca.dev/)
side by side. Each agent can work in its own worktree, with its own running instance, without stepping on the others.

### Option B: without Docker

1. Install [bun](https://bun.sh/docs/installation).
2. Clone the repository:

   ```bash
   git clone git@github.com:LucaPipolo/lcp-web.git && cd lcp-web
   ```

3. Install dependencies and start the dev server:

   ```bash
   bun install && bun run dev
   ```

This serves the site at `localhost:4321` with no HTTPS, but it is otherwise identical to Option A.
