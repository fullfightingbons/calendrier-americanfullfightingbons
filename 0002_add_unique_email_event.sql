name: Deploy — Cloudflare Worker & D1

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  # ══════════════════════════════════════════════════════════════
  # JOB 1 : Appliquer le schéma SQL sur D1
  # ══════════════════════════════════════════════════════════════
  migrate:
    name: Migrate D1 schema
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install Wrangler
        run: npm install -g wrangler

      - name: Apply schema.sql to D1 (production)
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
        run: |
          wrangler d1 execute calendrier-americanfullfightingbonsdb \
            --file=schema.sql \
            --remote

      # IMPORTANT : schema.sql ne fait que créer les tables de base
      # (CREATE TABLE IF NOT EXISTS) et n'est jamais mis à jour pour les
      # évolutions de schéma ultérieures (ex : le statut 'ferme', ajouté par
      # 0003_add_ferme_status.sql). Sans cette étape, le code applicatif
      # peut référencer des colonnes/valeurs qui violent encore les
      # contraintes CHECK définies dans schema.sql.
      - name: Apply D1 migrations (remote)
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
        run: |
          wrangler d1 migrations apply DB --remote

  # ══════════════════════════════════════════════════════════════
  # JOB 2 : Déployer le Worker
  # ══════════════════════════════════════════════════════════════
  deploy:
    name: Deploy Worker
    runs-on: ubuntu-latest
    needs: migrate
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install Wrangler
        run: npm install -g wrangler

      - name: Deploy Worker to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: deploy

      # CORRECTION CRITIQUE : printf au lieu de echo
      # echo ajoute un \n en fin de chaîne → token corrompu → auth cassée
      - name: Set ADMIN_TOKEN secret on Worker
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
        run: |
          printf '%s' "${{ secrets.CF_ADMIN_TOKEN }}" | \
            wrangler secret put ADMIN_TOKEN \
              --name calendrier-americanfullfightingbons
