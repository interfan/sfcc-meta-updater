"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const xml2js = __importStar(require("xml2js"));
// Function to handle file upload and parsing
function uploadSFCCMetaFile(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileUris = yield vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: false,
            filters: {
                'XML Files': ['xml'],
            },
            openLabel: 'Select SFCC Meta System Object File',
        });
        if (!fileUris || fileUris.length === 0) {
            vscode.window.showErrorMessage('No file selected.');
            return null;
        }
        const filePath = fileUris[0].fsPath;
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        // Parse the XML
        const parser = new xml2js.Parser();
        return new Promise((resolve, reject) => {
            parser.parseString(fileContent, (err, result) => {
                if (err) {
                    vscode.window.showErrorMessage('Error parsing XML file.');
                    reject(err);
                }
                // Cast the parsed data to SFCCMetaData
                const parsedData = result;
                // Check if metadata exists before proceeding
                if (!parsedData || !parsedData.metadata || !parsedData.metadata['type-extension']) {
                    vscode.window.showErrorMessage('Invalid XML structure. Missing metadata or type-extension.');
                    reject('Invalid XML structure');
                }
                else {
                    // Store parsed data in context or global state for further use
                    context.globalState.update('sfcc-meta-file', parsedData);
                    vscode.window.showInformationMessage('SFCC Meta file uploaded and parsed successfully.');
                    resolve(parsedData);
                }
            });
        });
    });
}
// Function to select a destination file with predictive search
function selectDestinationFile() {
    return __awaiter(this, void 0, void 0, function* () {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open.');
            return;
        }
        const workspacePath = workspaceFolders[0].uri.fsPath;
        // Use findFiles to search for XML files dynamically based on input
        const files = yield vscode.workspace.findFiles('**/*.xml', '**/node_modules/**'); // Exclude node_modules
        // Map the files to file paths for display
        const filePaths = files.map(file => file.fsPath);
        // Display files for the user to select based on the typed input
        const selectedFile = yield vscode.window.showQuickPick(filePaths, {
            placeHolder: 'Select the destination XML file to update',
            matchOnDetail: true, // This ensures that file names are matched even if typed partially
        });
        if (selectedFile) {
            return selectedFile;
        }
        vscode.window.showErrorMessage('No file selected.');
        return null;
    });
}
// Function to update the whole type-extension in the destination file
function updateWholeTypeExtension(context) {
    return __awaiter(this, void 0, void 0, function* () {
        // Ensure the meta file is uploaded first
        const parsedData = yield uploadSFCCMetaFile(context);
        if (!parsedData)
            return; // Return early if the upload failed
        const typeExtensions = parsedData.metadata['type-extension'];
        // Let the user choose which type-extension to update
        const typeIds = typeExtensions.map((type) => type['$']['type-id']);
        const selectedTypeId = yield vscode.window.showQuickPick(typeIds, {
            placeHolder: 'Select Type Extension to update',
        });
        if (!selectedTypeId)
            return;
        const selectedType = typeExtensions.find((type) => type['$']['type-id'] === selectedTypeId);
        if (!selectedType) {
            vscode.window.showErrorMessage('Selected type-extension not found.');
            return;
        }
        const selectedFilePath = yield selectDestinationFile();
        if (!selectedFilePath)
            return;
        const destinationFileContent = fs.readFileSync(selectedFilePath, 'utf-8');
        const parser = new xml2js.Parser();
        const builder = new xml2js.Builder();
        try {
            const result = yield parser.parseStringPromise(destinationFileContent);
            // Ensure the structure is correct before trying to modify it
            if (!result.metadata || !result.metadata['type-extension']) {
                vscode.window.showErrorMessage('Destination file does not have the expected metadata or type-extension structure.');
                return;
            }
            // Find the selected type-extension in the destination file and update it
            const selectedTypeToUpdate = result.metadata['type-extension'].find((type) => type['$']['type-id'] === selectedTypeId);
            if (!selectedTypeToUpdate) {
                vscode.window.showErrorMessage('Selected type-extension to update was not found in the destination file.');
                return;
            }
            // Update the selected type-extension, while preserving other type-extensions
            const updatedTypeExtensions = result.metadata['type-extension'].map((type) => {
                if (type['$']['type-id'] === selectedTypeId) {
                    return selectedType; // Replace the selected type-extension with the new one
                }
                return type; // Keep the others unchanged
            });
            // Assign the updated type-extensions back to the result
            result.metadata['type-extension'] = updatedTypeExtensions;
            // Rebuild the XML and write back to the destination file
            const updatedXml = builder.buildObject(result);
            fs.writeFileSync(selectedFilePath, updatedXml);
            vscode.window.showInformationMessage('Destination file updated with selected type-extension.');
        }
        catch (err) {
            if (err instanceof Error) {
                vscode.window.showErrorMessage('Error parsing destination XML file: ' + err.message);
            }
            else {
                vscode.window.showErrorMessage('Unknown error occurred during file parsing.');
            }
        }
    });
}
function updateDetailedTypeExtension(context) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const parsedData = yield uploadSFCCMetaFile(context);
        if (!parsedData)
            return;
        const typeExtensions = parsedData.metadata['type-extension'];
        const typeIds = typeExtensions.map((type) => type['$']['type-id']);
        const selectedTypeId = yield vscode.window.showQuickPick(typeIds, {
            placeHolder: 'Select Type Extension to update',
        });
        if (!selectedTypeId)
            return;
        const selectedType = typeExtensions.find((type) => type['$']['type-id'] === selectedTypeId);
        if (!selectedType) {
            vscode.window.showErrorMessage('Selected type-extension not found.');
            return;
        }
        // Extract attribute-definitions
        let attributeDefinitions = [];
        if (selectedType['custom-attribute-definitions'] && selectedType['custom-attribute-definitions'][0]) {
            attributeDefinitions = selectedType['custom-attribute-definitions'][0]['attribute-definition'] || [];
        }
        if (attributeDefinitions.length === 0) {
            vscode.window.showErrorMessage('No attribute definitions found for the selected type-extension.');
            return;
        }
        const attributeNames = attributeDefinitions
            .map((attr) => attr['$']['attribute-id'])
            .sort();
        const selectedAttributes = yield vscode.window.showQuickPick(attributeNames, {
            canPickMany: true,
            placeHolder: 'Select attributes to update (Ctrl+Click to select multiple)',
        });
        if (!selectedAttributes) {
            vscode.window.showErrorMessage('No attributes selected.');
            return;
        }
        // Select group definitions
        const groupDefinitions = selectedType['group-definitions'][0]['attribute-group'] || [];
        const groupNames = groupDefinitions.map((group) => group['$']['group-id']).sort();
        const selectedGroupDefinitions = yield vscode.window.showQuickPick(groupNames, {
            canPickMany: true,
            placeHolder: 'Select group definitions to update (Ctrl+Click to select multiple)',
        });
        if (!selectedGroupDefinitions) {
            vscode.window.showErrorMessage('No group definitions selected.');
            return;
        }
        // Update option
        const updateOption = yield vscode.window.showQuickPick(['Update with selected attributes', 'Update only the differences', 'Copy the entire group definition'], { placeHolder: 'Choose how you want to update the group definitions' });
        if (!updateOption) {
            vscode.window.showErrorMessage('No update option selected.');
            return;
        }
        const selectedFilePath = yield selectDestinationFile();
        if (!selectedFilePath)
            return;
        const destinationFileContent = fs.readFileSync(selectedFilePath, 'utf-8');
        const parser = new xml2js.Parser();
        const builder = new xml2js.Builder({
            renderOpts: { pretty: true },
            xmldec: { version: '1.0', encoding: 'UTF-8' },
        });
        try {
            const result = yield parser.parseStringPromise(destinationFileContent);
            if (!result.metadata || !result.metadata['type-extension']) {
                vscode.window.showErrorMessage('Destination file does not have the expected metadata or type-extension structure.');
                return;
            }
            const selectedTypeToUpdate = result.metadata['type-extension'].find((type) => type['$']['type-id'] === selectedTypeId);
            if (!selectedTypeToUpdate) {
                vscode.window.showErrorMessage('Selected type-extension to update was not found in the destination file.');
                return;
            }
            // === CUSTOM ATTRIBUTES MERGE ===
            const allAttributes = ((_b = (_a = selectedTypeToUpdate['custom-attribute-definitions']) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b['attribute-definition']) || [];
            const selectedAttributeIdsSet = new Set(selectedAttributes);
            const mergedAttributes = allAttributes.map((attr) => {
                if (selectedAttributeIdsSet.has(attr['$']['attribute-id'])) {
                    const newAttr = attributeDefinitions.find((a) => a['$']['attribute-id'] === attr['$']['attribute-id']);
                    return newAttr || attr;
                }
                return attr;
            });
            // Add new attributes if missing
            selectedAttributes.forEach((attributeId) => {
                if (!mergedAttributes.some((attr) => attr['$']['attribute-id'] === attributeId)) {
                    const newAttr = attributeDefinitions.find((a) => a['$']['attribute-id'] === attributeId);
                    if (newAttr)
                        mergedAttributes.push(newAttr);
                }
            });
            // Sort attributes alphabetically
            mergedAttributes.sort((a, b) => {
                const idA = a['$']['attribute-id'].toLowerCase();
                const idB = b['$']['attribute-id'].toLowerCase();
                return idA.localeCompare(idB);
            });
            if (!selectedTypeToUpdate['custom-attribute-definitions']) {
                selectedTypeToUpdate['custom-attribute-definitions'] = [{}];
            }
            selectedTypeToUpdate['custom-attribute-definitions'][0]['attribute-definition'] = mergedAttributes;
            // === GROUP DEFINITIONS MERGE ===
            const allGroups = selectedTypeToUpdate['group-definitions'][0]['attribute-group'] || [];
            const updatedGroupIdsSet = new Set(selectedGroupDefinitions);
            const mergedGroups = allGroups.map((group) => {
                var _a;
                if (updatedGroupIdsSet.has(group['$']['group-id'])) {
                    const newGroup = Object.assign({}, group);
                    if (updateOption === 'Copy the entire group definition') {
                        // Copy entire group from source file
                        const sourceGroup = groupDefinitions.find((g) => g['$']['group-id'] === group['$']['group-id']);
                        if (sourceGroup) {
                            return sourceGroup;
                        }
                        return group;
                    }
                    if (updateOption === 'Update with selected attributes') {
                        newGroup['attribute'] = selectedAttributes.map((attrId) => ({
                            '$': { 'attribute-id': attrId }
                        }));
                    }
                    else if (updateOption === 'Update only the differences') {
                        const existingAttributes = ((_a = newGroup['attribute']) === null || _a === void 0 ? void 0 : _a.map((attr) => attr['$']['attribute-id'])) || [];
                        newGroup['attribute'] = selectedAttributes
                            .filter(attrId => existingAttributes.includes(attrId))
                            .map(attrId => ({
                            '$': { 'attribute-id': attrId }
                        }));
                    }
                    return newGroup;
                }
                return group;
            });
            // === ADD NEW GROUPS IF NOT EXIST ===
            selectedGroupDefinitions.forEach((groupId) => {
                const alreadyExists = mergedGroups.some((group) => group['$']['group-id'] === groupId);
                if (!alreadyExists) {
                    mergedGroups.push({
                        '$': { 'group-id': groupId },
                        'display-name': [{
                                '_': groupId,
                                '$': { 'xml:lang': 'x-default' }
                            }],
                        'attribute': selectedAttributes.map((attrId) => ({
                            '$': { 'attribute-id': attrId }
                        }))
                    });
                }
            });
            selectedTypeToUpdate['group-definitions'][0]['attribute-group'] = mergedGroups;
            // === WRITE BACK ===
            const updatedXml = builder.buildObject(result);
            fs.writeFileSync(selectedFilePath, updatedXml);
            vscode.window.showInformationMessage('Destination file updated with selected attributes and groups.');
        }
        catch (err) {
            if (err instanceof Error) {
                vscode.window.showErrorMessage('Error parsing destination XML file: ' + err.message);
            }
            else {
                vscode.window.showErrorMessage('Unknown error occurred during file parsing.');
            }
        }
    });
}
// Registering the commands
function activate(context) {
    const disposableUpload = vscode.commands.registerCommand('sfcc-meta-object-manager.uploadMetaFile', () => __awaiter(this, void 0, void 0, function* () {
        yield uploadSFCCMetaFile(context);
    }));
    const disposableWholeUpdate = vscode.commands.registerCommand('sfcc-meta-object-manager.updateWholeTypeExtension', () => __awaiter(this, void 0, void 0, function* () {
        yield updateWholeTypeExtension(context);
    }));
    const disposableDetailedUpdate = vscode.commands.registerCommand('sfcc-meta-object-manager.updateDetailedTypeExtension', () => __awaiter(this, void 0, void 0, function* () {
        yield updateDetailedTypeExtension(context);
    }));
    context.subscriptions.push(disposableUpload);
    context.subscriptions.push(disposableWholeUpdate);
    context.subscriptions.push(disposableDetailedUpdate);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map