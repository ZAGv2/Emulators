name: Generate Emulator Tools

on:
  schedule:
    - cron: "0 */2 * * *"
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repo
        uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Run Generator
        run: node generateTools.js

      - name: Commit Changes
        run: |
          git config --global user.name "zag-bot"
          git config --global user.email "bot@zag.dev"
          git add .
          git commit -m "Auto update emulator tools" || echo "No changes"
          git push