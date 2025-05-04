# SFCC Meta Object Manager (VS Code Extension)

**Author:** Ivaylo Trepetanov  
**License:** MIT

---

A Visual Studio Code extension for Salesforce Commerce Cloud (SFCC) developers to easily manage and update **meta XML files for system objects (type extensions)**.  
This tool helps avoid manual editing of XML by providing easy-to-use UI commands to update attributes, group definitions, and to split meta files into organized XML files.

## 🚀 Features

- Upload and manage SFCC meta XML files
- Replace entire type extensions in system-object meta XML files
- Update attributes and groups inside type extensions (add, merge, copy)
- Export type extensions into individual XML files
- Export type extensions and group definitions into individual XML files
- Automatic alphabetical sorting of attributes and groups
- Prevent manual XML mistakes and reduce tedious editing

## 📌 Use Cases

- Updating system object custom attributes (`custom-attribute-definitions`)
- Modifying or adding attribute groups (`group-definitions`)
- Synchronizing meta definitions between environments or versions
- Splitting large meta XML files into smaller, organized files for better maintainability
- Keeping XML clean, sorted and validated automatically

---

## 📦 Commands

### 1️⃣ **SFCC Meta: Replace Entire Type Extension**

Replaces the selected system object's entire type extension in a destination XML file.

- Overwrites the type-extension
- Automatically sorts attributes and groups alphabetically

✅ Use when you want to completely replace a type extension.

---

### 2️⃣ **SFCC Meta: Update Attributes & Groups (Type Extension)**

Allows detailed updating of attributes and groups for a selected type-extension:

- Add or update selected attributes
- Add new groups or update existing ones
- Choose how groups are updated (copy, merge, or only add missing attributes)
- Automatically sorts attributes and groups

✅ Use when you only want to update specific parts of a type extension.

---

### 3️⃣ **SFCC Meta: Export TypeExtensions to Files**

Splits each type-extension in a meta XML file into its own XML file.

Example:

system-object.my-type-id.group-id.xml


✅ Use when you want granular exports per group definition.

---

## ✅ Notes

- Attributes and Groups are always sorted alphabetically during exports and updates.
- No manual XML editing is needed → changes are handled by the extension.
- Uploading meta files happens automatically when running commands.
- Commands are available from the VS Code Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).

---

## 📂 Repository

[GitHub - SFCC Meta Object Manager](https://github.com/your-username/sfcc-meta-object-manager)

---

## 📥 Installation

Install via VS Code Marketplace or by sideloading the `.vsix` package (coming soon).

---

## 📧 Support

For issues or questions, please open an issue on the [GitHub repository](https://github.com/your-username/sfcc-meta-object-manager/issues).

---

## License

MIT © 2025 Ivaylo Trepetanov
