---
title: "Rift: how I run multiple AI agents in parallel with Docker and Git worktrees"
slug: "parallel-ai-agents-with-docker"
metaTitle: "Rift: running AI agents in parallel with Docker and Git"
metaDescription: >-
  Every AI agent gets its own Docker environment, ports and local HTTPS domain: how I built Rift with Laravel Zero and use it with Orca.
description: >-
  A separate Docker environment, ports and local HTTPS domain for every AI
  agent. How I built Rift with Laravel Zero and use it alongside Orca to work
  on multiple features in parallel.
published: 2026-11-06
tags:
  - ai-agents
  - docker
  - git
  - laravel
  - developer-tools
---

[Git worktrees](https://git-scm.com/docs/git-worktree) let you work on several branches of the same repository without constantly switching between them. Each worktree has its own directory and checkout, while sharing the same underlying Git repository. They're particularly useful when working with multiple AI agents, as each agent can tackle a different feature without interfering with the others.

Things get more complicated when you need to run the applications. Three worktrees mean three development servers trying to use port `4321`, potentially alongside three PostgreSQL databases all trying to bind to `5432`. The first one starts just fine; the others run into port conflicts.

You can work around this manually by changing ports and adjusting each environment's configuration, but that quickly becomes tedious when several agents are working in parallel. Each agent needs to be able to run the application to check its changes, and I want to be able to open each version in my browser without having to reconfigure Docker every time.

That's why I built [Rift](https://github.com/LucaPipolo/rift), an open-source CLI that manages independent Docker environments for Git worktrees, automatically assigning ports and local HTTPS domains.

## An environment for every agent

Rift lets you run multiple copies of the same project at once, each with its own containers, ports and HTTPS address. For example, a project with three worktrees might look like this:

| Worktree          | Address                       |
| ----------------- | ----------------------------- |
| `myapp/`          | `https://myapp.test`          |
| `myapp-search/`   | `https://search.myapp.test`   |
| `myapp-checkout/` | `https://checkout.myapp.test` |

I can keep all three applications running, switch between them in the browser and stop one environment without affecting the others. This is especially handy when several agents are working on different features and I want to review their work as they finish.

Rift works with the existing [Docker Compose](https://docs.docker.com/compose/) or [Laravel Sail](https://laravel.com/docs/sail) configuration and uses [Caddy](https://caddyserver.com/) as a shared reverse proxy to handle HTTPS and route requests to the right containers. You install the CLI once, then configure each project through a YAML file.

## How Rift started

The first version dates back to August, when I set up the Docker development environment for this website. I needed to work on several branches at once, so I wrote four Bash files to handle it: `setup.sh`, `up.sh`, `down.sh` and a shared library of functions. Almost six hundred lines of code altogether.

The approach was already very similar to how Rift works today. Each checkout used its directory name as the Docker Compose project name, allowing Docker to create separate containers, networks and volumes. All environments connected to a single Caddy router, which handled HTTPS certificates and routed requests based on the domain. When a worktree started, the scripts registered its route through Caddy's admin API and removed it again when the environment stopped. A local DNS resolver pointed all `*.test` domains to `127.0.0.1`, so I didn't have to keep editing `/etc/hosts`.

The scripts worked well and solved the problem for this website, but they were tightly coupled to its configuration. Reusing them elsewhere would have meant adapting the code for every new project.

I decided to turn that setup into a standalone tool that I could install once and configure for each project using a YAML file.

With Rift 1.0, the almost six hundred lines of Bash I had been using for this website were replaced by a `rift.yaml` file:

```yaml
name: lcp-web
domain: lcp-web.test

preset: compose

app:
  service: app
  port: 4321

ports:
  - { key: APP_PORT, default: 4321 }
```

All the logic for preparing environments, managing containers, assigning ports and configuring the router now lives in Rift. The YAML file only contains the settings specific to each project.

## How it works

Rift builds on your existing Docker setup, so there's no need to rewrite your services or adopt a particular project structure. Running `rift init` reads the Compose files and environment variables, suggests an initial configuration and generates a `rift.yaml` file.

The initial setup also requires a small change to Docker Compose to connect the application service to the shared router network and make the common Git directory available inside the container. Once you've committed that configuration to the repository, new worktrees will inherit it automatically.

From there, creating an environment for a new branch takes just three commands:

```bash
git worktree add -b search ../myapp-search
cd ../myapp-search
rift setup
```

`rift setup` prepares the `.env` file, assigns available ports, starts the containers and registers the application with the router. The new worktree becomes available at `https://search.myapp.test`, while the main copy continues running at `https://myapp.test`.

For day-to-day use, there are only a handful of commands:

```bash
rift up        # Start the current worktree
rift down      # Stop it without affecting the others
rift status    # Show applications registered with the router
rift doctor    # Diagnose configuration issues
```

One decision I made early on was to leave Docker Compose files untouched at runtime. Rift manages ports through environment variables, updating their values in `.env` while preserving unrelated keys, comments and their original order. The ports you want Rift to manage do need to be defined through variables in Compose, but otherwise the project continues to work as before. If I want to start the services manually with `docker compose up`, I still can.

## How I use Rift with Orca

The main use case I'm interested in is parallel development with AI agents. I currently use [Orca](https://onorca.dev/), an Agent Development Environment (ADE) that lets me manage several tasks at once, each in its own Git worktree.

With Orca, I can assign a feature to one agent, have another fix a bug and carry on working on a third branch myself. Each task has its own directory, so agents can edit files without getting in each other's way. With Docker-based projects, though, there's still the challenge of running all those environments simultaneously. That's where Rift comes in.

Orca lets you configure scripts that run automatically when a worktree is created or archived. Integrating Rift only takes two commands.

In the setup script:

```bash
cd "$ORCA_WORKTREE_PATH" && rift setup
```

And in the archive script:

```bash
cd "$ORCA_WORKTREE_PATH" && rift down
```

When I create a new task in Orca, the first script prepares the worktree's Docker environment, assigns its ports and starts the application. When I archive the task, the second stops its containers and removes its route from the router, leaving everything else running.

In practice, I can create a task, assign it to an agent and let it work on its own branch. When I want to review the changes, the application is already available at its local HTTPS address. If several agents are working at once, I can open their respective versions in the browser and compare the results without switching branches or constantly restarting services.

I find this particularly useful for UI changes, new features and, more generally, anything where reading a diff isn't enough to judge the result. I can see how the application actually behaves while the other agents carry on with their tasks.

## Why I chose Laravel Zero

When I decided to turn the Bash scripts into a proper CLI, [Laravel Zero](https://laravel-zero.com/) felt like a natural choice. I've been working with Laravel for years, I like how it's structured and I've always appreciated its developer experience. I wanted to bring that same approach to this project.

Laravel Zero is a framework for building CLI applications using many of Laravel's familiar components and conventions. It gives you a well-organised way to structure commands, manage dependencies and build terminal interfaces with interactive prompts, progress indicators and formatted output.

I also wanted Rift to be pleasant to use, with straightforward commands, readable messages and useful feedback while things are running. When a tool starts several containers, configures a router or updates environment variables, you need to understand what it's doing and where something went wrong. Laravel Zero let me focus on those details while working with tools I already knew well.

Testability was another big reason. Rift regularly runs external commands, mainly `docker` and `git`, and communicates with Caddy's HTTP API. Laravel provides `Process`, `Http` and `Sleep`, along with their respective fakes, so I can simulate those operations in tests without actually running processes or changing anything on the machine.

The test suite uses [Pest](https://pestphp.com/) and achieves 100% code coverage and type coverage, with [Larastan](https://github.com/larastan/larastan) configured at its highest level. Rift's development environment is also fully containerised, so all you need to work on the project is Docker and [GNU Make](https://www.gnu.org/software/make/). There's no need to install PHP locally.

### A standalone executable with PHP included

Rift is written in [PHP](https://www.php.net/), but I didn't want users to have to install PHP or manage its dependencies. Instead, I decided to distribute it as a standalone executable with the runtime included.

The build process packages the application into a PHAR archive and appends it to a static PHP runtime called _micro_, provided by [static-php-cli](https://static-php.dev/):

```bash
cat "$micro" "$root/builds/rift.phar" > "$root/builds/rift-$target"
```

The result is a single executable for macOS and Linux, available for both ARM64 and x86-64. During the build, downloaded runtimes are checked against checksums stored in the repository to make sure the expected files are being used.

To make installation easier, the repository also acts as a [Homebrew](https://brew.sh/) tap:

```bash
brew tap lucapipolo/rift https://github.com/LucaPipolo/rift
brew trust lucapipolo/rift
brew install rift
```

This means I get to keep building Rift with Laravel, while anyone using it only needs to install a single executable, without worrying about PHP or Composer.

## One shared router for every project

One of the trickier parts to implement was the router. Rift uses a single Caddy container to serve every project and its worktrees, so each environment needs to be able to register and remove its own routes without touching anyone else's.

Caddy's admin API provides a `POST /load` endpoint for loading a complete configuration, but doing so replaces whatever is already there. Using it while other projects are running would risk wiping out their routes.

Rift therefore only uses that endpoint to initialise an empty router. After that, each worktree adds and removes its own routes through targeted API operations. When I run `rift down`, only the configuration associated with the current environment is removed, and the other projects carry on running as normal.

HTTPS is also managed centrally through Caddy's local Certificate Authority, which only needs to be trusted by the machine once. Rift can then generate certificates for all project domains, including additional hostnames used by APIs or admin panels.

There's one detail worth knowing about wildcard certificates: a certificate for `*.myapp.test` covers `search.myapp.test`, but not `api.search.myapp.test`, because wildcards only match a single subdomain level. Rift takes this into account when registering a worktree's hostnames, requesting the additional certificates needed for anything the main wildcard doesn't cover.

## Managing ports without conflicts

Port allocation was another part that needed some care. When a worktree is created, Rift inherits the main copy's `.env` file, if available, including the ports configured for its services. Those ports may already be in use by other environments.

Rift checks the ports defined in `rift.yaml` and keeps their current values when they're available, selecting another port if there's a conflict. But checking which ports are currently in use isn't quite enough: it also needs to account for worktrees that aren't running.

Imagine two stopped worktrees, both configured to expose PostgreSQL on port `5432`. If Rift only checked listening ports, it could consider `5432` available for both. The conflict wouldn't appear until you tried to start them at the same time.

To avoid that, Rift also treats ports already assigned to other worktrees in the same project as reserved, whether those worktrees are running or not. At the same time, it recognises ports used by the current worktree's containers, so restarting an environment doesn't unnecessarily change its port assignments.

It's the sort of detail you barely notice when everything works, but it matters when you're constantly starting and stopping multiple environments throughout the day.

## Give it a try

[Rift](https://github.com/LucaPipolo/rift) is open source and released under the [MIT licence](https://opensource.org/license/mit). It runs on macOS and Linux and requires [Git](https://git-scm.com/), [Docker](https://www.docker.com/) and a project configured with Docker Compose or Laravel Sail. It works with [Docker Desktop](https://www.docker.com/products/docker-desktop/), [OrbStack](https://orbstack.dev/) and [Colima](https://github.com/abiosoft/colima).

To use local `*.test` domains, you'll need a DNS resolver pointing them to `127.0.0.1`, such as [dnsmasq](https://thekelleys.org.uk/dnsmasq/doc.html). Ports 80, 443 and 2019 also need to be available for the shared router.

You'll find the code, documentation and releases at [github.com/LucaPipolo/rift](https://github.com/LucaPipolo/rift). If you try it on one of your projects and run into trouble, start with `rift doctor` to check your configuration. If that doesn't help, feel free to [open an issue on GitHub](https://github.com/LucaPipolo/rift/issues).
