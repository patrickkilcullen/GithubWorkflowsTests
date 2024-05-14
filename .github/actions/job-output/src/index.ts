import * as core from '@actions/core'
import * as github from '@actions/github'
import { GitHub } from '@actions/github/lib/utils'
import type {PullRequest} from '@octokit/webhooks-types'

async function main(): Promise<void> {
  try {
    const testReporter = new TestReporter()
    await testReporter.run()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error)
    else core.setFailed(JSON.stringify(error))
  }
}

class TestReporter {
  readonly token = core.getInput('token', {required: true})
  readonly octokit: InstanceType<typeof GitHub>
  readonly context = getCheckRunContext()

  constructor() {
    this.octokit = github.getOctokit(this.token)
  }

  async run() {
    try {
      core.startGroup(`Creating test report attempt`)
      const tr = await this.createReport()
    } finally {
      core.endGroup()
    }
  }

  async createReport() {
    const name = "Report";

    core.info(`Creating check run ${name}`)
    const createResp = await this.octokit.rest.checks.create({
      head_sha: this.context.sha,
      name,
      status: 'in_progress',
      output: {
        title: name,
        summary: 'testing'
      },
      ...github.context.repo
    })

    // core.info(`Updating check run conclusion (${conclusion}) and output`)
    // const resp = await this.octokit.rest.checks.update({
    //   check_run_id: createResp.data.id,
    //   conclusion,
    //   status: 'completed',
    //   output: {
    //     title: shortSummary,
    //     summary,
    //     annotations
    //   },
    //   ...github.context.repo
    // })
  }
}



function getCheckRunContext(): {sha: string; runId: number} {
  if (github.context.eventName === 'workflow_run') {
    core.info('Action was triggered by workflow_run: using SHA and RUN_ID from triggering workflow')
    const event = github.context.payload
    if (!event.workflow_run) {
      throw new Error("Event of type 'workflow_run' is missing 'workflow_run' field")
    }
    return {
      sha: event.workflow_run.head_commit.id,
      runId: event.workflow_run.id
    }
  }

  const runId = github.context.runId
  if (github.context.payload.pull_request) {
    core.info(`Action was triggered by ${github.context.eventName}: using SHA from head of source branch`)
    const pr = github.context.payload.pull_request as PullRequest
    return {sha: pr.head.sha, runId}
  }

  return {sha: github.context.sha, runId}
}