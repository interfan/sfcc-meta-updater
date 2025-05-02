# SFCC Meta Object Manager (VS Code Extension)

**Author:** Ivaylo Trepetanov
**License:** MIT

---

A Visual Studio Code extension for Salesforce Commerce Cloud (SFCC) developers to easily manage and update **meta XML files for system objects** (type extensions).  
This tool helps avoid manual editing of XML by providing easy-to-use UI commands to update attributes and group definitions.

## 🚀 Features

- Upload and manage SFCC meta XML files
- Replace entire type extensions in system-object meta XML files
- Update attributes and groups inside type extensions (add, merge, copy)
- Automatic alphabetical sorting of attributes and groups
- Prevent manual XML mistakes and reduce tedious editing

## 📌 Use Cases

- Updating system object custom attributes (`custom-attribute-definitions`)
- Modifying or adding attribute groups (`group-definitions`)
- Synchronizing meta definitions between environments or versions
- Keeping XML clean and sorted automatically

---

## 📦 Commands

### 1️⃣ **SFCC Update Meta: Replace Entire Type Extension**

Replaces the selected system object's entire type-extension in a destination XML file.  
This overwrites the full type-extension but automatically sorts attributes and groups alphabetically for clarity.

✅ Use when you want to completely replace a type extension.

---

### 2️⃣ **SFCC Update Meta: Update Attributes & Groups (Type Extension)**

Allows detailed updating of attributes and groups for a selected type-extension:

- Add or update selected attributes
- Add new groups or update existing ones
- Choose how groups are updated (copy, merge, or only add missing attributes)
- Automatic sorting of attributes and groups

✅ Use when you only want to update parts of the type-extension without replacing everything.

---

## ✅ Notes

- Attributes and Groups are automatically sorted alphabetically after updates.
- No need to manually edit XML files → changes are handled by the extension.
- Uploading meta files happens in the background when running commands.
- Commands are available from the VS Code command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).

---

## 📂 Repository

[GitHub - SFCC Meta Object Manager](https://github.com/your-username/sfcc-meta-object-manager)

---

## 📥 Installation

Install via VS Code Marketplace or by sideloading the `.vsix` package (coming soon).

---

## 📧 Support

For issues or questions, please open an issue on the [GitHub repository](https://github.com/your-username/sfcc-meta-object-manager/issues).

## License

MIT © 2024 Ivaylo Trepetanov


