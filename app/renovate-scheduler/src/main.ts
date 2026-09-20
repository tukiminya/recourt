import { App } from "octokit";

const GITHUB_API_VERSION = "2026-03-10";

export default {
  async scheduled(controller, env) {
    const app = new App({
      appId: env.GITHUB_APP_CLIENT_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY,
    });

    const logContext = {
      event: "renovate_workflow_dispatch",
      cron: controller.cron,
      scheduledTime: controller.scheduledTime,
      repository: `${env.GITHUB_OWNER}/${env.GITHUB_REPOSITORY}`,
      workflow: env.GITHUB_WORKFLOW,
      ref: env.GITHUB_REF,
    };

    try {
      const { data: installation } = await app.octokit.request(
        "GET /repos/{owner}/{repo}/installation",
        {
          owner: env.GITHUB_OWNER,
          repo: env.GITHUB_REPOSITORY,
          headers: {
            "x-github-api-version": GITHUB_API_VERSION,
          },
        },
      );

      const octokit = await app.getInstallationOctokit(installation.id);
      const response = await octokit.request(
        "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
        {
          owner: env.GITHUB_OWNER,
          repo: env.GITHUB_REPOSITORY,
          workflow_id: env.GITHUB_WORKFLOW,
          ref: env.GITHUB_REF,
          headers: {
            "x-github-api-version": GITHUB_API_VERSION,
          },
        },
      );

      console.log({
        ...logContext,
        installationId: installation.id,
        status: response.status,
        githubRequestId: response.headers["x-github-request-id"],
      });
    } catch (error) {
      console.error({
        ...logContext,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message }
            : { message: "Unknown error" },
      });
      throw error;
    }
  },
} satisfies ExportedHandler<Env>;
