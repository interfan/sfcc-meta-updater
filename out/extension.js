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
const path = __importStar(require("path"));
const xml2js = __importStar(require("xml2js"));
function uploadSFCCMetaFile(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileUris = yield vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: false,
            filters: { 'XML Files': ['xml'] },
            openLabel: 'Select SFCC Meta System Object File',
        });
        if (!fileUris || fileUris.length === 0) {
            vscode.window.showErrorMessage('No file selected.');
            return null;
        }
        const filePath = fileUris[0].fsPath;
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parser = new xml2js.Parser();
        return new Promise((resolve, reject) => {
            parser.parseString(fileContent, (err, result) => {
                var _a;
                if (err) {
                    vscode.window.showErrorMessage('Error parsing XML file.');
                    reject(err);
                }
                const parsedData = result;
                if (!((_a = parsedData === null || parsedData === void 0 ? void 0 : parsedData.metadata) === null || _a === void 0 ? void 0 : _a['type-extension'])) {
                    vscode.window.showErrorMessage('Invalid XML structure. Missing metadata or type-extension.');
                    reject('Invalid XML structure');
                }
                else {
                    context.globalState.update('sfcc-meta-file', parsedData);
                    vscode.window.showInformationMessage('SFCC Meta file uploaded and parsed successfully.');
                    resolve(parsedData);
                }
            });
        });
    });
}
function selectDestinationFile() {
    return __awaiter(this, void 0, void 0, function* () {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace open.');
            return;
        }
        const files = yield vscode.workspace.findFiles('**/*.xml', '**/node_modules/**');
        const filePaths = files.map(file => file.fsPath);
        const selectedFile = yield vscode.window.showQuickPick(filePaths, {
            placeHolder: 'Select destination XML file',
            matchOnDetail: true,
        });
        return selectedFile || null;
    });
}
function selectFolder() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const folders = yield vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Select destination folder',
        });
        return (_a = folders === null || folders === void 0 ? void 0 : folders[0]) === null || _a === void 0 ? void 0 : _a.fsPath;
    });
}
function updateWholeTypeExtension(context) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const parsedData = yield uploadSFCCMetaFile(context);
        if (!parsedData)
            return;
        const typeExtensions = parsedData.metadata['type-extension'];
        const typeIds = typeExtensions.map(t => t['$']['type-id']);
        const selectedTypeId = yield vscode.window.showQuickPick(typeIds, { placeHolder: 'Select Type Extension' });
        if (!selectedTypeId)
            return;
        const selectedType = typeExtensions.find(t => t['$']['type-id'] === selectedTypeId);
        if (!selectedType)
            return;
        const selectedFilePath = yield selectDestinationFile();
        if (!selectedFilePath)
            return;
        const destinationContent = fs.readFileSync(selectedFilePath, 'utf-8');
        const parser = new xml2js.Parser();
        const builder = new xml2js.Builder({ renderOpts: { pretty: true }, xmldec: { version: '1.0', encoding: 'UTF-8' } });
        try {
            const result = yield parser.parseStringPromise(destinationContent);
            if (!((_a = result.metadata) === null || _a === void 0 ? void 0 : _a['type-extension'])) {
                vscode.window.showErrorMessage('Destination file structure invalid.');
                return;
            }
            const clonedType = JSON.parse(JSON.stringify(selectedType));
            clonedType['custom-attribute-definitions'][0]['attribute-definition'].sort((a, b) => a['$']['attribute-id'].localeCompare(b['$']['attribute-id']));
            clonedType['group-definitions'][0]['attribute-group'].sort((a, b) => a['$']['group-id'].localeCompare(b['$']['group-id']));
            result.metadata['type-extension'] = result.metadata['type-extension'].map((type) => type['$']['type-id'] === selectedTypeId ? clonedType : type);
            fs.writeFileSync(selectedFilePath, builder.buildObject(result));
            vscode.window.showInformationMessage('Destination file updated successfully.');
        }
        catch (err) {
            vscode.window.showErrorMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
        }
    });
}
function updateDetailedTypeExtension(context) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        const parsedData = yield uploadSFCCMetaFile(context);
        if (!parsedData)
            return;
        const typeExtensions = parsedData.metadata['type-extension'];
        const typeIds = typeExtensions.map(t => t['$']['type-id']);
        const selectedTypeId = yield vscode.window.showQuickPick(typeIds, { placeHolder: 'Select Type Extension' });
        if (!selectedTypeId)
            return;
        const selectedType = typeExtensions.find(t => t['$']['type-id'] === selectedTypeId);
        if (!selectedType)
            return;
        const attributeDefinitions = ((_a = selectedType['custom-attribute-definitions'][0]) === null || _a === void 0 ? void 0 : _a['attribute-definition']) || [];
        const attributeIds = attributeDefinitions.map(a => a['$']['attribute-id']).sort();
        const selectedAttributes = (yield vscode.window.showQuickPick(attributeIds, { canPickMany: true, placeHolder: 'Select attributes' })) || [];
        const groupDefinitions = ((_b = selectedType['group-definitions'][0]) === null || _b === void 0 ? void 0 : _b['attribute-group']) || [];
        const groupIds = groupDefinitions.map(g => g['$']['group-id']).sort();
        const selectedGroups = (yield vscode.window.showQuickPick(groupIds, { canPickMany: true, placeHolder: 'Select groups' })) || [];
        if (!selectedAttributes.length && !selectedGroups.length)
            return;
        const updateOption = selectedGroups.length
            ? yield vscode.window.showQuickPick(['Update with selected attributes', 'Update only the differences', 'Copy the entire group definition'], { placeHolder: 'Group update mode' })
            : undefined;
        const selectedFilePath = yield selectDestinationFile();
        if (!selectedFilePath)
            return;
        const destinationContent = fs.readFileSync(selectedFilePath, 'utf-8');
        const parser = new xml2js.Parser();
        const builder = new xml2js.Builder({ renderOpts: { pretty: true }, xmldec: { version: '1.0', encoding: 'UTF-8' } });
        try {
            const result = yield parser.parseStringPromise(destinationContent);
            const selectedTypeToUpdate = result.metadata['type-extension'].find((t) => t['$']['type-id'] === selectedTypeId);
            if (!selectedTypeToUpdate)
                return;
            if (selectedAttributes.length) {
                const allAttributes = ((_c = selectedTypeToUpdate['custom-attribute-definitions'][0]) === null || _c === void 0 ? void 0 : _c['attribute-definition']) || [];
                const merged = allAttributes.map((attr) => selectedAttributes.includes(attr['$']['attribute-id'])
                    ? attributeDefinitions.find(a => a['$']['attribute-id'] === attr['$']['attribute-id']) || attr
                    : attr);
                selectedAttributes.forEach(attrId => {
                    if (!merged.some((attr) => attr['$']['attribute-id'] === attrId)) {
                        const newAttr = attributeDefinitions.find(a => a['$']['attribute-id'] === attrId);
                        if (newAttr)
                            merged.push(newAttr);
                    }
                });
                merged.sort((a, b) => a['$']['attribute-id'].localeCompare(b['$']['attribute-id']));
                selectedTypeToUpdate['custom-attribute-definitions'][0]['attribute-definition'] = merged;
            }
            if (selectedGroups.length) {
                const allGroups = selectedTypeToUpdate['group-definitions'][0]['attribute-group'] || [];
                const mergedGroups = allGroups.map((group) => {
                    var _a;
                    if (!selectedGroups.includes(group['$']['group-id']))
                        return group;
                    const sourceGroup = groupDefinitions.find(g => g['$']['group-id'] === group['$']['group-id']);
                    const newGroup = Object.assign({}, group);
                    if (updateOption === 'Copy the entire group definition') {
                        return sourceGroup || group;
                    }
                    const existingAttrIds = (newGroup['attribute'] || []).map(attr => attr['$']['attribute-id']);
                    const newAttrIds = updateOption === 'Update only the differences'
                        ? [...new Set([...existingAttrIds, ...(((_a = sourceGroup === null || sourceGroup === void 0 ? void 0 : sourceGroup.attribute) === null || _a === void 0 ? void 0 : _a.map(a => a['$']['attribute-id'])) || [])])]
                        : [...new Set([...existingAttrIds, ...selectedAttributes])];
                    newAttrIds.sort();
                    newGroup['attribute'] = newAttrIds.map(id => ({ '$': { 'attribute-id': id } }));
                    return newGroup;
                });
                selectedGroups.forEach(groupId => {
                    if (!mergedGroups.some(g => g['$']['group-id'] === groupId)) {
                        mergedGroups.push({
                            '$': { 'group-id': groupId },
                            'display-name': [{ '_': groupId, '$': { 'xml:lang': 'x-default' } }],
                            'attribute': selectedAttributes.map(id => ({ '$': { 'attribute-id': id } })),
                        });
                    }
                });
                mergedGroups.sort((a, b) => a['$']['group-id'].localeCompare(b['$']['group-id']));
                selectedTypeToUpdate['group-definitions'][0]['attribute-group'] = mergedGroups;
            }
            fs.writeFileSync(selectedFilePath, builder.buildObject(result));
            vscode.window.showInformationMessage('Destination file updated.');
        }
        catch (err) {
            vscode.window.showErrorMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
        }
    });
}
function splitByTypeExtensions(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const parsedData = yield uploadSFCCMetaFile(context);
        if (!parsedData)
            return;
        const destinationFolder = yield selectFolder();
        if (!destinationFolder)
            return;
        const builder = new xml2js.Builder({ renderOpts: { pretty: true }, xmldec: { version: '1.0', encoding: 'UTF-8' } });
        parsedData.metadata['type-extension'].forEach(typeExt => {
            const filename = path.join(destinationFolder, `system-object.${typeExt['$']['type-id']}.xml`);
            fs.writeFileSync(filename, builder.buildObject({ metadata: { 'type-extension': [typeExt] } }));
        });
        vscode.window.showInformationMessage('TypeExtensions exported.');
    });
}
function splitByTypeAndGroups(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const parsedData = yield uploadSFCCMetaFile(context);
        if (!parsedData)
            return;
        const destinationFolder = yield selectFolder();
        if (!destinationFolder)
            return;
        const builder = new xml2js.Builder({ renderOpts: { pretty: true }, xmldec: { version: '1.0', encoding: 'UTF-8' } });
        parsedData.metadata['type-extension'].forEach(typeExt => {
            var _a, _b;
            const typeId = typeExt['$']['type-id'];
            const groups = ((_b = (_a = typeExt['group-definitions']) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b['attribute-group']) || [];
            if (!groups.length) {
                const filename = path.join(destinationFolder, `system-object.${typeId}.xml`);
                fs.writeFileSync(filename, builder.buildObject({ metadata: { 'type-extension': [typeExt] } }));
            }
            else {
                groups.forEach((group) => {
                    const groupId = group['$']['group-id'];
                    const filename = path.join(destinationFolder, `system-object.${typeId}.${groupId}.xml`);
                    const exportData = {
                        metadata: {
                            'type-extension': [
                                {
                                    '$': { 'type-id': typeId },
                                    'custom-attribute-definitions': typeExt['custom-attribute-definitions'],
                                    'group-definitions': [{ 'attribute-group': [group] }],
                                },
                            ],
                        },
                    };
                    fs.writeFileSync(filename, builder.buildObject(exportData));
                });
            }
        });
        vscode.window.showInformationMessage('TypeExtensions and Groups exported.');
    });
}
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('sfcc-meta-object-manager.replaceSystemObjectType', () => updateWholeTypeExtension(context)));
    context.subscriptions.push(vscode.commands.registerCommand('sfcc-meta-object-manager.updateSystemObjectAttributesAndGroups', () => updateDetailedTypeExtension(context)));
    context.subscriptions.push(vscode.commands.registerCommand('sfcc-meta-object-manager.exportTypeExtensions', () => splitByTypeExtensions(context)));
    context.subscriptions.push(vscode.commands.registerCommand('sfcc-meta-object-manager.exportTypeExtensionsAndGroups', () => splitByTypeAndGroups(context)));
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map