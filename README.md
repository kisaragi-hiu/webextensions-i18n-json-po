# wei18n-po-conv

Converting between the [WebExtensions API messages.json format](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n/Locale-Specific_Message_reference) and Gettext PO files.

Isn't perfect, relies on you checking the diff afterwards.

This is mainly for being able to translate WebExtensions with KDE's Lokalize.

Publish:

- unprivate
- Set up NPM token
- Uncomment publish.yml
- Fill in

  ```json
    "bin": {
      "<pkg>": "dist/index.js"
    },
  ```

  into package.json

i18next-gettext-converter also works, but it doesn't handle the message descriptions.
