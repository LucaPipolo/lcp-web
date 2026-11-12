---
title: "How I work with AI agents: models, sandboxes and privacy"
slug: "how-i-work-with-ai-agents"
metaTitle: "How I work with AI agents: models, sandboxes and privacy"
metaDescription: >-
  How I work with multiple AI agents using shared rules, different
  harnesses and models, Docker Sandboxes and privacy safeguards.
description: >-
  A look at my development setup with Claude Code, OpenCode and local models,
  including how I share instructions, choose models, isolate agents,
  work in parallel and protect personal data.
published: 2026-11-12
tags:
  - ai-agents
  - docker
  - privacy
  - developer-tools
related:
  - building-rift
---

I use AI agents almost every day, both on personal projects and client work. I often have several running at once, each working on a different task. Over the past few months, I've tried various harnesses, models and configurations, gradually putting together a development environment that I now use fairly consistently.

I started out working with one agent at a time. I'd give it a task, review the changes and move on to the next one. Once I began splitting work between several agents and choosing different models depending on the difficulty, I had more things to think about: how to make sure everyone followed the same project conventions, prevent agents from interfering with each other's files, control what they could execute and keep sensitive information off external services.

My responsibility hasn't changed. I set the goals, assess the proposed solutions and verify the results. Agents can inspect code, suggest approaches, implement changes and run tests, but I review their work before merging it and remain responsible for what goes into production.

In this article, I'll walk through how I've set up my environment, which tools I use and the reasons behind those choices. I take a similar approach to writing. On the [AI content and assistance page](/en/ai-content/), I explain how I use these tools to draft and edit articles on this site, including the one you're reading.

## Keeping project rules consistent across agents

One of the first problems I ran into was having to repeat the same instructions in every session. Each time I started with a new agent, I had to explain the project structure, coding conventions, where commands should run and how commits should be prepared. Decisions made in one session weren't necessarily available when I switched to another.

I eventually moved those instructions into the repository itself. I use `AGENTS.md` as the main source of project rules. For [Claude Code](https://claude.com/product/claude-code), which looks for a file called `CLAUDE.md`, I add a small file containing:

```markdown
@AGENTS.md
```

Claude Code imports the referenced file, allowing me to maintain one set of project rules across different harnesses. My global preferences live in `~/.claude/CLAUDE.md`, which [OpenCode](https://opencode.ai/) can also use when it doesn't have its own global configuration.

As projects grow, though, putting everything into a single file becomes less practical. I prefer splitting instructions by subject, such as architecture, development environment, Git conventions and documentation, and loading the more specific rules only when they're relevant. An agent editing a blog post doesn't need the project's TypeScript conventions, just as an agent working on the backend doesn't necessarily need its editorial guidelines.

I try to keep these instructions specific. In this site's repository, for example, they explain that development commands should run inside Docker containers, which local URL to use when checking changes and why code and content belong in separate commits. Many of these rules came from mistakes I'd already corrected several times. Once I notice myself repeating the same correction, I'd rather document it than keep explaining it in chat.

### Skills and MCP servers

Project rules describe how agents should work, while recurring tasks are handled through skills. I have skills for creating commits that follow the repository's conventions, opening pull requests, addressing review comments and updating dependencies one at a time.

My personal skills live in `~/.claude/skills/` and are linked into OpenCode's configuration as well. This lets me maintain a single implementation that works in both harnesses. There are some tasks I'd rather trigger myself, such as dependency updates. For those, I use `disable-model-invocation: true` in the skill's frontmatter to prevent agents from invoking them automatically.

I also use [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers to give agents access to documentation and external services. For documentation, I rely on [Context7](https://context7.com/) or the framework's official server when one is available. This is particularly useful with libraries that change frequently, since the agent can look up current documentation instead of relying on knowledge from its training. Other integrations let agents inspect deployments, logs and errors in production.

The project's MCP configuration is committed to the repository, so every worktree has access to the same integrations. It's one of the few areas where I still have to maintain separate configurations for each harness, since their formats aren't quite the same.

## Two harnesses, several models

Keeping project instructions in a shared place makes it easier to switch harnesses without having to redefine how I work. I currently use Claude Code, developed by [Anthropic](https://www.anthropic.com/), and OpenCode, choosing between them depending on the task.

Claude Code is usually my choice for more demanding work, such as large refactors, architectural decisions or difficult bugs. I normally use Sonnet as the main model and Opus as an _advisor_, giving me a second opinion before I commit to an approach or consider a task finished. It means I can use a more capable model when its input is valuable without paying for it on every operation.

OpenCode is the harness I use most often day to day. What I particularly like is its flexibility: I can work with models from Anthropic, [OpenAI](https://openai.com/), [DeepSeek](https://www.deepseek.com/) and [Moonshot AI](https://www.moonshot.ai/), which develops Kimi, as well as models running locally on my computer.

I've configured six agents with different responsibilities and capability levels:

| Agent       | Role                             | Current model       |
| ----------- | -------------------------------- | ------------------- |
| `build`     | Everyday code changes            | DeepSeek V4.1 Flash |
| `build-pro` | More complex changes             | Kimi K3.1 Pro       |
| `build-max` | Particularly demanding work      | Claude Sonnet 5.5   |
| `plan`      | Analysis and planning, read-only | GPT-6.1 Sol         |
| `plan-max`  | A second opinion on a plan       | Claude Opus 5.5     |
| `local`     | Local tasks and sensitive data   | Qwen 3.5 9B         |

The names describe each agent's job and expected capability rather than the model behind it. `build` can modify code, while `plan` analyses a problem and prepares an approach without touching files. The `-pro` and `-max` suffixes represent higher levels that I use when a task calls for a more capable model.

This makes it easy to replace models without changing my workflow. If I find a better option for `build-pro` in a few months, I can update its configuration and keep using the same agent.

Each agent is defined in a Markdown file, with the model specified in the frontmatter and its instructions in the body. For example:

```markdown
---
description: Stronger build agent for harder multi-file changes.
mode: primary
model: opencode-go/kimi-k3.1-pro
---

You are the escalation build agent. You are used when the default build agent
struggled or when a change spans several files.
```

### How I choose a model

I considered introducing an automatic router that would assess each request and pick the most appropriate model. In the end, I decided to keep that decision manual, mainly because I use a mixture of subscriptions and API keys. Most of the routers I looked at work through APIs, while some of my models are available only through authentication tied to a subscription. Automatic routing would therefore cover only part of the models I use.

Instead, I follow a fairly simple rule: start with the cheapest model I think can handle the task, then move up when necessary. For everyday changes, I use `build`. If it struggles, I move to `build-pro`, then `build-max`, and eventually Claude Code for the hardest problems.

I also try to separate planning from implementation. Working out a good approach can justify using a stronger model, but once the decisions have been made, much of the implementation can often be handled by a cheaper one. That distinction is particularly useful in software development, where a task might involve dozens of tool calls, file reads, edits and tests.

Of course, I don't always get the choice right. Sometimes a cheaper model spends far too long on something a stronger model could solve quickly. That's why I consider the time spent on failed attempts and corrections alongside the cost of individual requests.

### A local model for simpler tasks

I also run a local model, mainly for working with confidential documents and tasks that don't need particularly advanced reasoning.

My machine is a MacBook Pro with an M3 Pro and 18 GB of unified memory. Once the operating system and other applications have taken their share, I can realistically give a model around 10 to 12 GB. With those limits in mind, I chose [Qwen](https://qwen.ai/) 3.5 9B, running through [Ollama](https://ollama.com/).

My first experiments weren't particularly encouraging. Even simple requests took a long time, and the model often got stuck producing lengthy reasoning without reaching a useful answer. After trying a few configurations, I found that the main problems were its _thinking_ mode and a context window that was too small for agent work.

I created a version with a 32K-token context window:

```bash
printf 'FROM qwen3.5:9b\nPARAMETER num_ctx 32768\n' > Modelfile
ollama create qwen3.5-32k -f Modelfile
```

I also disabled explicit reasoning in OpenCode with `reasoning_effort: "none"`. Those changes made a noticeable difference in my setup, especially for shorter tasks.

Over time, I've also learnt to be more selective about what I give it. I wouldn't trust a model of this size to answer questions that need up-to-date information or complex reasoning. During my tests, for example, it tended to invent dates and facts it didn't know. It works much better when I provide the relevant material and ask it to work directly with that.

I mainly use it for rewriting, translating and summarising text, along with small, well-defined code changes. For confidential documents, it has another important advantage: I can process them without sending their contents to an external service.

I'd also like to try [llama.cpp](https://github.com/ggml-org/llama.cpp) as an alternative to Ollama to see whether I can improve performance and the reliability of tool calls.

## Isolating agents from my computer

Once I've chosen a harness and model, I still need to decide where the agent will run. This matters because an agent with terminal access could potentially read files from other projects, credentials, SSH keys or personal documents that have nothing to do with its task.

Harnesses provide permission controls, but approving every command becomes impractical when several agents are working at once. I decided to isolate their execution environments using [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/).

Each sandbox is effectively a small isolated virtual machine, with its own Docker environment and access limited to the project directory. Agents can execute commands and work on shared project files without automatically gaining access to the rest of my computer.

After setting up my first sandbox, I ran a straightforward test: I asked Claude Code to list my home directory and read `~/.ssh`. It couldn't access those files on my Mac, which was exactly what I wanted to confirm.

To avoid remembering sandbox names and command options, I've created two shell functions, `claude-box` and `opencode-box`. From a project's directory, they create the sandbox if it doesn't exist or reopen it if it's already there.

Here's the function I use for OpenCode:

```bash
opencode-box() {
  local name="$(_sbx_project_name)-opencode"
  if _sbx_exists "$name"; then
    sbx run "$name"
  else
    sbx run --name="$name" --template "$SBX_OPENCODE_TEMPLATE" --memory "$SBX_MEMORY" opencode .
  fi
}
```

For a project called `myapp`, I end up with two separate environments: `myapp-claude` and `myapp-opencode`.

I've also capped each sandbox at 4 GB of memory. It's a necessary compromise on my Mac, particularly when I'm running a local model at the same time. Without that limit, several virtual environments could consume too much memory and slow everything else down.

Claude Code was relatively easy to configure: I just needed to authenticate inside the sandbox. OpenCode took a little more work because the available image included an older version and couldn't access my Mac's configuration. I built a custom image with the version I use and my agents.

I also had to resolve a conflict between my configuration and the one automatically generated by the sandbox for its MCP gateway. In the end, I moved my settings to a separate location and loaded them using `OPENCODE_CONFIG`, allowing both configurations to coexist.

With those adjustments, I could use both harnesses inside isolated environments while keeping the configurations I normally work with.

## Running multiple agents with Git worktrees and Rift

Sandboxes control which parts of my computer agents can access, but there's another problem to solve: how to let several agents work on the same project without overwriting each other's changes.

I use a separate [Git worktree](https://git-scm.com/docs/git-worktree) for each feature. Every agent gets its own directory and branch, so it can edit files, run tests and prepare commits without directly interfering with another agent's work.

I organise tasks using [Orca](https://www.onorca.dev/) and manage development environments with [Rift](https://github.com/LucaPipolo/rift), a CLI tool I built to give each worktree its own containers, ports and local HTTPS domain. I've covered how Rift works in more detail in [a separate article](/en/blog/parallel-ai-agents-with-docker/).

When I create a task, Orca prepares the worktree and runs `rift setup` and `rift up` on my Mac. That gets the development environment running, and I can then open the worktree's terminal and launch `claude-box` or `opencode-box`. The agent works inside its sandbox, while Rift runs the services needed to build and test the application.

I deliberately keep Rift outside the sandboxes. Each sandbox already has its own isolated Docker environment, which can't see the containers or the [Caddy](https://caddyserver.com/) router running on my Mac. Running another copy of the whole application inside each sandbox would duplicate services and consume resources without much benefit.

Instead, the sandbox works directly on the worktree's shared files. The containers managed by Rift pick up those changes, so I can open the corresponding local domain and check the result in my browser.

This setup lets me work on several features at the same time, each with its own branch, development environment and agent. Once a feature is ready, I review the changes and merge them through the usual pull request process.

## Protecting data when using cloud models

Sandboxes help protect my computer by limiting which files an agent can access. There's another consideration, though: an agent that's allowed to read a document can include its contents in a request to a model. If that model runs in the cloud, the information leaves my machine.

I work across Italy and Spain, and sometimes handle documents containing personal information in both languages: names, Italian tax codes, VAT numbers, Spanish NIF and NIE identifiers, IBANs and other identifying details. I've added several safeguards for this kind of work, choosing between them depending on the data and the task.

In software projects, my first concern is secrets, particularly API keys and `.env` files. I try to keep these outside agents' reach through project rules, permission settings and environment isolation.

For requests sent to models through APIs, I've set up a local gateway using [LiteLLM](https://docs.litellm.ai/) and [Microsoft Presidio](https://microsoft.github.io/presidio/). It runs in Docker on my Mac and examines requests before forwarding them to the provider. The aim is to identify and mask personal information, including certain Italian and Spanish identifiers, then restore the original values when the response comes back.

For documents, I also use [rizzo-pii](https://github.com/Rizzo-AI-Academy/rizzo-pii). It lets me anonymise text locally, send the modified version to a model and restore the original values afterwards. It's primarily designed for Italian, but I use it with Spanish documents too.

### Where these safeguards fall short

It's important to recognise that none of these measures guarantees that every piece of personal information will be protected.

The gateway can only inspect traffic that actually passes through it. Some of the models I access through subscriptions and direct authentication, including certain Claude Code and OpenCode configurations, connect straight to their providers without going through LiteLLM.

Automatic detection of personal data also has limitations. Presidio might correctly identify an email address or tax identifier, but it can mistake a variable name for someone's name or miss information written in an unusual format. This becomes particularly noticeable with source code, where masking can change things the model needs in order to complete its task.

That's why the sensitivity of the data is part of how I choose an agent:

| Type of work                              | How I handle it                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| Code without personal data                | Choose the agent based on difficulty                                       |
| Documents containing personal data        | Anonymise locally before using a cloud model                               |
| Projects that may contain personal data   | Use `build`, `build-pro` or `local`, depending on the available safeguards |
| Information that must stay on my computer | Use `local` exclusively                                                    |

When I use `build` or `build-pro` through the gateway, I still need to check that requests are actually passing through the masking system and that sensitive information has been recognised correctly.

If information cannot be shared with an external provider, I'd rather keep it off cloud services altogether than rely solely on automatic anonymisation.

## Switching harnesses without losing context

Working with several harnesses gives me more flexibility, but it also creates a practical problem: what happens to the accumulated context when I need to move from OpenCode to Claude Code, or the other way round?

Sometimes I start a task with a cheaper model and realise I need a more capable one. Other times I simply want to continue in a different harness. Explaining everything again takes time, and it's easy to miss a decision or an important detail along the way.

To make that easier, I've created a shared skill that prepares a handover document.

When I type `handoff`, the agent creates `.ai/HANDOFF.md` with the task's objective, work completed so far, decisions made, outstanding issues and next steps. It also includes the paths of the files worth reading first.

In the other harness, I type `resume`. The agent reads the document, reconstructs the context and gives me a summary before continuing.

The handover file also follows a privacy rule: it mustn't contain personal data. When it needs to refer to sensitive information, it uses file paths or placeholders such as `[CLIENT_1]`. That's important because the document might later be read by a harness that doesn't use my anonymisation gateway.

It's a fairly simple mechanism, but it saves me from manually rebuilding the context whenever I switch tools.

## Reviewing and recording the work

Shared rules and isolated environments make it easier to work with several agents, but I still need a reliable way to review what they produce. Before merging a feature, I inspect the diff, check the tests and make sure the changes match what I asked for. I also use [ChatGPT Codex](https://chatgpt.com/codex) to review pull requests, giving me another assessment before the merge.

To keep a record of AI-assisted work, commits created with an agent include a `Co-Authored-By` trailer and a `Model:` line identifying the model involved. I've also added a dedicated commit type, `ai`, for changes to agent instructions, skills and configuration.

I keep this information for transparency, but also because I want to understand how well my workflows perform. Knowing which model contributed to a change helps me compare results and decide when using a more expensive model is worthwhile. I'd eventually like to record token usage per commit too, once I can collect that information reliably.

The repository becomes the place where changes, checks and final decisions are recorded. I can replace a model, switch harnesses or change the execution environment without losing the history of the work.

## A setup that keeps evolving

This environment is the result of several months of experiments and adjustments. Some decisions were obvious from the start, while others came from problems I encountered along the way: agents ignoring conventions, development environments competing for the same ports, local models running too slowly or configurations exposing more files than necessary.

Today, I can work with several agents in parallel, each in its own environment and following the same project rules. I can choose models according to the task, use a local model when data needs to stay on my computer and switch harnesses without losing context. I still review the code and run the checks before merging anything.

There's plenty I'd like to improve. I want to measure the real cost of different models more accurately, keep refining how I protect personal information and explore more efficient ways to run models locally. I'll also have to revisit parts of the setup as tools and models continue to change.

What I value most is having a process I can use across different projects. When I start something new, the conventions, environments and way of dividing up the work are already in place. That leaves me more time to understand the problem, make decisions and check that the result does what I need.
