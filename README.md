# webextensions-i18n-json-po

Converting between the [WebExtensions API messages.json format](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n/Locale-Specific_Message_reference) and Gettext PO files.

May not be perfect, relies on you checking the diff afterwards.

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
