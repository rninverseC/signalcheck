# Publish SignalCheck yourself

SignalCheck is a static website. Its deployable directory is **`dist`**. No build command, paid API key, database, or server is required. The research Python scripts are only for retraining or reproducing evaluation; they are not part of hosting.

Uploading the repository does not publish it. The included workflow has only `workflow_dispatch`, so no push or pull request automatically deploys a site.

## GitHub Pages

1. Open this repository on GitHub.
2. Under **Settings → Pages**, choose **GitHub Actions** as the publishing source.
3. Open **Actions → Publish SignalCheck → Run workflow** and select `main`.
4. When it succeeds, open the URL shown by the deployment.

A private repository needs an eligible GitHub plan for Pages. GitHub Free supports Pages for public repositories. Decide whether you want to share your source before changing repository visibility. See [GitHub’s Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

The workflow follows GitHub’s [static Pages template](https://github.com/actions/starter-workflows/blob/main/pages/static.yml), publishes `dist/` instead of the whole repository, and removes automatic publishing on pushes.

## Another static host

Use these project settings in your chosen hosting service:

| Setting | Value |
| --- | --- |
| Project type | Static HTML / no framework |
| Build command | None |
| Publish/output directory | `dist` |
| Environment variables | None |

For a file-upload deployment, upload the **contents** of `dist` so that `index.html` is at the deployment root. Uploading only `index.html` will omit the JavaScript modules, styles, and model weights.

Use HTTPS when publishing. Keep the relative paths intact. On-device translation depends on browser support and may download language packs after a visitor clicks Translate. No website account is required by the app itself.

## Preview before publishing

```sh
npm start
```

Open `http://127.0.0.1:4173`, then try the English, Spanish, and Chinese example buttons. Run `npm test` for the automated checks. Review [MODEL_CARD.md](MODEL_CARD.md) for detector limits and attribution.
