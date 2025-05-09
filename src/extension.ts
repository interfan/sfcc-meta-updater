import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';

// Define types for parsed XML data
interface AttributeDefinition {
    '$': {
        'attribute-id': string;
        'type': string;
    };
}

interface GroupDefinition {
    '$': {
        'group-id': string;
        'type'?: string;
    };
    'display-name'?: Array<{
        '_': string;
        '$': { 'xml:lang': string };
    }>;
    'attribute'?: Array<{
        '$': {
            'attribute-id': string;
        };
    }>;
}

interface TypeExtension {
    '$': {
        'type-id': string;
    };
    'custom-attribute-definitions': [
        {
            'attribute-definition': AttributeDefinition[];
        }
    ];
    'group-definitions': [
        {
            'attribute-group': GroupDefinition[];
        }
    ];
}

interface CustomType {
    '$': {
        'type-id': string;
    };
    'attribute-definitions': [
        {
            'attribute-definition': AttributeDefinition[];
        }
    ];
    'group-definitions': [
        {
            'attribute-group': GroupDefinition[];
        }
    ];
}

interface SFCCMetaData {
    metadata: {
        'type-extension'?: TypeExtension[];
        'custom-type'?: CustomType[];
    };
}

type MetaType = 'type-extension' | 'custom-type';

async function uploadSFCCMetaFile(context: vscode.ExtensionContext, expectedType: MetaType): Promise<SFCCMetaData | null> {
    const fileUris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectMany: false,
        filters: { 'XML Files': ['xml'] },
        openLabel: 'Select SFCC Meta File',
    });

    if (!fileUris || fileUris.length === 0) {
        vscode.window.showErrorMessage('No file selected.');
        return null;
    }

    const filePath = fileUris[0].fsPath;
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const parser = new xml2js.Parser({
        explicitArray: true,
        explicitCharkey: true,
        tagNameProcessors: [xml2js.processors.stripPrefix], // REMOVE NAMESPACE
    });

    return new Promise((resolve, reject) => {
        parser.parseString(fileContent, (err, result) => {
            if (err) {
                vscode.window.showErrorMessage('Error parsing XML file.');
                reject(err);
                return;
            }

            const parsedData = result as SFCCMetaData;

            if (!parsedData?.metadata?.[expectedType]) {
                vscode.window.showErrorMessage(`Invalid XML structure. Missing metadata or ${expectedType}.`);
                reject('Invalid XML structure');
                return;
            }

            context.globalState.update('sfcc-meta-file', parsedData);
            vscode.window.showInformationMessage(`SFCC Meta file (${expectedType}) uploaded and parsed successfully.`);
            resolve(parsedData);
        });
    });
}

async function selectDestinationFile() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const files = await vscode.workspace.findFiles('**/*.xml', '**/node_modules/**');
    const filePaths = files.map(file => file.fsPath);

    const selectedFile = await vscode.window.showQuickPick(filePaths, {
        placeHolder: 'Select destination XML file',
        matchOnDetail: true,
    });

    return selectedFile || null;
}

async function selectFolder(): Promise<string | undefined> {
    const folders = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: 'Select destination folder',
    });

    return folders?.[0]?.fsPath;
}

async function updateWholeTypeExtension(context: vscode.ExtensionContext) {
    const parsedData = await uploadSFCCMetaFile(context, 'type-extension');
    if (!parsedData) return;

    const typeExtensions = parsedData.metadata['type-extension'];
    if (!typeExtensions) {
        vscode.window.showErrorMessage('No type-extension data found.');
        return;
    }
    const typeIds = typeExtensions.map(t => t['$']['type-id']);

    const selectedTypeId = await vscode.window.showQuickPick(typeIds, { placeHolder: 'Select Type Extension' });
    if (!selectedTypeId) return;

    const selectedType = typeExtensions.find(t => t['$']['type-id'] === selectedTypeId);
    if (!selectedType) return;

    const selectedFilePath = await selectDestinationFile();
    if (!selectedFilePath) return;

    const destinationContent = fs.readFileSync(selectedFilePath, 'utf-8');
    const parser = new xml2js.Parser();
    const builder = new xml2js.Builder({ renderOpts: { pretty: true }, xmldec: { version: '1.0', encoding: 'UTF-8' } });

    try {
        const result = await parser.parseStringPromise(destinationContent);

        if (!result.metadata?.['type-extension']) {
            vscode.window.showErrorMessage('Destination file structure invalid.');
            return;
        }

        const clonedType = JSON.parse(JSON.stringify(selectedType));
        (clonedType['custom-attribute-definitions'][0]['attribute-definition'] as AttributeDefinition[]).sort(
            (a, b) => a['$']['attribute-id'].localeCompare(b['$']['attribute-id'])
        );

        (clonedType['group-definitions'][0]['attribute-group'] as GroupDefinition[]).sort(
            (a, b) => a['$']['group-id'].localeCompare(b['$']['group-id'])
        );

        result.metadata['type-extension'] = result.metadata['type-extension'].map((type: any) =>
            type['$']['type-id'] === selectedTypeId ? clonedType : type
        );

        fs.writeFileSync(selectedFilePath, builder.buildObject(result));
        vscode.window.showInformationMessage('Destination file updated successfully.');
    } catch (err) {
        vscode.window.showErrorMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
}

async function updateDetailedTypeExtension(context: vscode.ExtensionContext) {
    const parsedData = await uploadSFCCMetaFile(context, 'type-extension');
    if (!parsedData) return;

    const typeExtensions = parsedData.metadata['type-extension'];
    if (!typeExtensions) {
        vscode.window.showErrorMessage('No type-extension data found.');
        return;
    }
    const typeIds = typeExtensions.map(t => t['$']['type-id']);

    const selectedTypeId = await vscode.window.showQuickPick(typeIds, { placeHolder: 'Select Type Extension' });
    if (!selectedTypeId) return;

    const selectedType = typeExtensions.find(t => t['$']['type-id'] === selectedTypeId);
    if (!selectedType) return;

    const attributeDefinitions = selectedType['custom-attribute-definitions'][0]?.['attribute-definition'] || [];
    const attributeIds = attributeDefinitions.map(a => a['$']['attribute-id']).sort();
    const selectedAttributes = await vscode.window.showQuickPick(attributeIds, { canPickMany: true, placeHolder: 'Select attributes' }) || [];

    const groupDefinitions = selectedType['group-definitions'][0]?.['attribute-group'] || [];
    const groupIds = groupDefinitions.map(g => g['$']['group-id']).sort();
    const selectedGroups = await vscode.window.showQuickPick(groupIds, { canPickMany: true, placeHolder: 'Select groups' }) || [];

    if (!selectedAttributes.length && !selectedGroups.length) return;

    const updateOption = selectedGroups.length
        ? await vscode.window.showQuickPick(['Update with selected attributes', 'Update only the differences', 'Copy the entire group definition'], { placeHolder: 'Group update mode' })
        : undefined;

    const selectedFilePath = await selectDestinationFile();
    if (!selectedFilePath) return;

    const destinationContent = fs.readFileSync(selectedFilePath, 'utf-8');
    const parser = new xml2js.Parser();
    const builder = new xml2js.Builder({ renderOpts: { pretty: true }, xmldec: { version: '1.0', encoding: 'UTF-8' } });

    try {
        const result = await parser.parseStringPromise(destinationContent);
        const selectedTypeToUpdate = result.metadata['type-extension'].find((t: any) => t['$']['type-id'] === selectedTypeId);
        if (!selectedTypeToUpdate) return;

        if (selectedAttributes.length) {
            const allAttributes = selectedTypeToUpdate['custom-attribute-definitions'][0]?.['attribute-definition'] || [];
            const merged = (allAttributes as AttributeDefinition[]).map((attr: AttributeDefinition) =>
                selectedAttributes.includes(attr['$']['attribute-id'])
                    ? attributeDefinitions.find(a => a['$']['attribute-id'] === attr['$']['attribute-id']) || attr
                    : attr
            );

            selectedAttributes.forEach(attrId => {
                if (!merged.some((attr: AttributeDefinition) => attr['$']['attribute-id'] === attrId)) {
                    const newAttr = attributeDefinitions.find(a => a['$']['attribute-id'] === attrId);
                    if (newAttr) merged.push(newAttr);
                }
            });

            merged.sort((a, b) => a['$']['attribute-id'].localeCompare(b['$']['attribute-id']));
            selectedTypeToUpdate['custom-attribute-definitions'][0]['attribute-definition'] = merged;
        }

        if (selectedGroups.length) {
            const allGroups = selectedTypeToUpdate['group-definitions'][0]['attribute-group'] || [];
            const mergedGroups = (allGroups as GroupDefinition[]).map((group: GroupDefinition) => {
                if (!selectedGroups.includes(group['$']['group-id'])) return group;

                const sourceGroup = groupDefinitions.find(g => g['$']['group-id'] === group['$']['group-id']);
                const newGroup = { ...group };

                if (updateOption === 'Copy the entire group definition') {
                    return sourceGroup || group;
                }

                const existingAttrIds = (newGroup['attribute'] || []).map(attr => attr['$']['attribute-id']);
                const newAttrIds = updateOption === 'Update only the differences'
                    ? [...new Set([...existingAttrIds, ...(sourceGroup?.attribute?.map(a => a['$']['attribute-id']) || [])])]
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
    } catch (err) {
        vscode.window.showErrorMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
}

async function splitByTypeExtensions(context: vscode.ExtensionContext) {
    const parsedData = await uploadSFCCMetaFile(context, 'type-extension');
    if (!parsedData) return;

    const typeExtensions = parsedData.metadata['type-extension'];
    if (!typeExtensions) {
        vscode.window.showErrorMessage('No type-extension data found.');
        return;
    }

    const destinationFolder = await selectFolder();
    if (!destinationFolder) return;

    const builder = new xml2js.Builder({ renderOpts: { pretty: true }, xmldec: { version: '1.0', encoding: 'UTF-8' } });

    typeExtensions.forEach((typeExt: TypeExtension) => {
        const filename = path.join(destinationFolder, `system-object.${typeExt['$']['type-id']}.xml`);
        fs.writeFileSync(filename, builder.buildObject({ metadata: { 'type-extension': [typeExt] } }));
    });

    vscode.window.showInformationMessage('TypeExtensions exported.');
}


async function splitByTypeAndGroups(context: vscode.ExtensionContext) {
    const parsedData = await uploadSFCCMetaFile(context, 'type-extension');
    if (!parsedData) return;

    const typeExtensions = parsedData.metadata['type-extension'];
    if (!typeExtensions) {
        vscode.window.showErrorMessage('No type-extension data found.');
        return;
    }

    const destinationFolder = await selectFolder();
    if (!destinationFolder) return;

    const builder = new xml2js.Builder({ renderOpts: { pretty: true }, xmldec: { version: '1.0', encoding: 'UTF-8' } });

    typeExtensions.forEach((typeExt: TypeExtension) => {
        const typeId = typeExt['$']['type-id'];
        const groups = typeExt['group-definitions']?.[0]?.['attribute-group'] || [];

        if (!groups.length) {
            const filename = path.join(destinationFolder, `system-object.${typeId}.xml`);
            fs.writeFileSync(filename, builder.buildObject({ metadata: { 'type-extension': [typeExt] } }));
        } else {
            groups.forEach((group: GroupDefinition) => {
                const groupId = group['$']['group-id'];

                // Collect only attributes used in the group
                const attributeIdsInGroup = group.attribute?.map(attr => attr['$']['attribute-id']) || [];

                const allAttributes: AttributeDefinition[] =
                    typeExt['custom-attribute-definitions']?.[0]?.['attribute-definition'] || [];

                const filteredAttributeDefinitions = allAttributes
                    .filter(attr => attributeIdsInGroup.includes(attr['$']['attribute-id']));

                const filename = path.join(destinationFolder, `system-object.${typeId}.${groupId}.xml`);
                const exportData = {
                    metadata: {
                        'type-extension': [
                            {
                                '$': { 'type-id': typeId },
                                'custom-attribute-definitions': [
                                    { 'attribute-definition': filteredAttributeDefinitions }
                                ],
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
}

async function replaceCustomObjectType(context: vscode.ExtensionContext) {
    const parsedData = await uploadSFCCMetaFile(context, 'custom-type');
    if (!parsedData) return;

    const customTypes = parsedData.metadata['custom-type'] as CustomType[];
    const typeIds = customTypes.map(t => t['$']['type-id']);

    const selectedTypeId = await vscode.window.showQuickPick(typeIds, { placeHolder: 'Select Custom Type' });
    if (!selectedTypeId) return;

    const selectedType = customTypes.find(t => t['$']['type-id'] === selectedTypeId);
    if (!selectedType) return;

    const selectedFilePath = await selectDestinationFile();
    if (!selectedFilePath) return;

    const destinationContent = fs.readFileSync(selectedFilePath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: true, tagNameProcessors: [xml2js.processors.stripPrefix] });
    const builder = new xml2js.Builder({ renderOpts: { pretty: true }, xmldec: { version: '1.0', encoding: 'UTF-8' } });

    try {
        const result = await parser.parseStringPromise(destinationContent);

        if (!result.metadata?.['custom-type']) {
            vscode.window.showErrorMessage('Destination file structure invalid.');
            return;
        }

        const clonedType = JSON.parse(JSON.stringify(selectedType));

        (clonedType['attribute-definitions'][0]['attribute-definition'] as AttributeDefinition[]).sort(
            (a, b) => a['$']['attribute-id'].localeCompare(b['$']['attribute-id'])
        );

        (clonedType['group-definitions'][0]['attribute-group'] as GroupDefinition[]).sort(
            (a, b) => a['$']['group-id'].localeCompare(b['$']['group-id'])
        );

        result.metadata['custom-type'] = result.metadata['custom-type'].map((type: any) =>
            type['$']['type-id'] === selectedTypeId ? clonedType : type
        );

        fs.writeFileSync(selectedFilePath, builder.buildObject(result));
        vscode.window.showInformationMessage('Destination Custom Type updated successfully.');
    } catch (err) {
        vscode.window.showErrorMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
}

async function updateCustomObjectAttributesAndGroups(context: vscode.ExtensionContext) {
    const parsedData = await uploadSFCCMetaFile(context, 'custom-type');
    if (!parsedData) return;

    const customTypes = parsedData.metadata['custom-type'] as CustomType[];
    const typeIds = customTypes.map(t => t['$']['type-id']);

    const selectedTypeId = await vscode.window.showQuickPick(typeIds, { placeHolder: 'Select Custom Type' });
    if (!selectedTypeId) return;

    const selectedType = customTypes.find(t => t['$']['type-id'] === selectedTypeId);
    if (!selectedType) return;

    const attributeDefinitions = selectedType['attribute-definitions'][0]?.['attribute-definition'] || [];
    const attributeIds = attributeDefinitions.map(a => a['$']['attribute-id']).sort();
    const selectedAttributes = await vscode.window.showQuickPick(attributeIds, { canPickMany: true, placeHolder: 'Select attributes' }) || [];

    const groupDefinitions = selectedType['group-definitions'][0]?.['attribute-group'] || [];
    const groupIds = groupDefinitions.map(g => g['$']['group-id']).sort();
    const selectedGroups = await vscode.window.showQuickPick(groupIds, { canPickMany: true, placeHolder: 'Select groups' }) || [];

    if (!selectedAttributes.length && !selectedGroups.length) return;

    const updateOption = selectedGroups.length
        ? await vscode.window.showQuickPick(['Update with selected attributes', 'Update only the differences', 'Copy the entire group definition'], { placeHolder: 'Group update mode' })
        : undefined;

    const selectedFilePath = await selectDestinationFile();
    if (!selectedFilePath) return;

    const destinationContent = fs.readFileSync(selectedFilePath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: true, tagNameProcessors: [xml2js.processors.stripPrefix] });
    const builder = new xml2js.Builder({ renderOpts: { pretty: true }, xmldec: { version: '1.0', encoding: 'UTF-8' } });

    try {
        const result = await parser.parseStringPromise(destinationContent);
        const selectedTypeToUpdate = result.metadata['custom-type'].find((t: any) => t['$']['type-id'] === selectedTypeId);
        if (!selectedTypeToUpdate) return;

        if (selectedAttributes.length) {
            const allAttributes = selectedTypeToUpdate['attribute-definitions'][0]?.['attribute-definition'] || [];
            const merged = (allAttributes as AttributeDefinition[]).map((attr: AttributeDefinition) =>
                selectedAttributes.includes(attr['$']['attribute-id'])
                    ? attributeDefinitions.find(a => a['$']['attribute-id'] === attr['$']['attribute-id']) || attr
                    : attr
            );

            selectedAttributes.forEach(attrId => {
                if (!merged.some((attr: AttributeDefinition) => attr['$']['attribute-id'] === attrId)) {
                    const newAttr = attributeDefinitions.find(a => a['$']['attribute-id'] === attrId);
                    if (newAttr) merged.push(newAttr);
                }
            });

            merged.sort((a, b) => a['$']['attribute-id'].localeCompare(b['$']['attribute-id']));
            selectedTypeToUpdate['attribute-definitions'][0]['attribute-definition'] = merged;
        }

        if (selectedGroups.length) {
            const allGroups = selectedTypeToUpdate['group-definitions'][0]['attribute-group'] || [];
            const mergedGroups = (allGroups as GroupDefinition[]).map((group: GroupDefinition) => {
                if (!selectedGroups.includes(group['$']['group-id'])) return group;

                const sourceGroup = groupDefinitions.find(g => g['$']['group-id'] === group['$']['group-id']);
                const newGroup = { ...group };

                if (updateOption === 'Copy the entire group definition') {
                    return sourceGroup || group;
                }

                const existingAttrIds = (newGroup['attribute'] || []).map(attr => attr['$']['attribute-id']);
                const newAttrIds = updateOption === 'Update only the differences'
                    ? [...new Set([...existingAttrIds, ...(sourceGroup?.attribute?.map(a => a['$']['attribute-id']) || [])])]
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
        vscode.window.showInformationMessage('Destination Custom Object updated.');
    } catch (err) {
        vscode.window.showErrorMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function splitByCustomType(context: vscode.ExtensionContext) {
    const parsedData = await uploadSFCCMetaFile(context, 'custom-type');
    if (!parsedData) return;

    const customTypes = parsedData.metadata['custom-type'];
    if (!customTypes) {
        vscode.window.showErrorMessage('No custom-type data found.');
        return;
    }

    const destinationFolder = await selectFolder();
    if (!destinationFolder) return;

    const builder = new xml2js.Builder({
        renderOpts: { pretty: true },
        xmldec: { version: '1.0', encoding: 'UTF-8' }
    });

    customTypes.forEach((customType: CustomType) => {
        const filename = path.join(destinationFolder, `custom-object.${customType['$']['type-id']}.xml`);
        fs.writeFileSync(filename, builder.buildObject({ metadata: { 'custom-type': [customType] } }));
    });

    vscode.window.showInformationMessage('Custom Types exported.');
}


async function splitByCustomTypeAndGroups(context: vscode.ExtensionContext) {
    const parsedData = await uploadSFCCMetaFile(context, 'custom-type');
    if (!parsedData) return;

    const customTypes = parsedData.metadata['custom-type'];
    if (!customTypes) {
        vscode.window.showErrorMessage('No custom-type data found.');
        return;
    }

    const destinationFolder = await selectFolder();
    if (!destinationFolder) return;

    const builder = new xml2js.Builder({
        renderOpts: { pretty: true },
        xmldec: { version: '1.0', encoding: 'UTF-8' }
    });

    customTypes.forEach((customType: CustomType) => {
        const typeId = customType['$']['type-id'];
        const groups = customType['group-definitions']?.[0]?.['attribute-group'] || [];

        if (!groups.length) {
            const filename = path.join(destinationFolder, `custom-object.${typeId}.xml`);
            fs.writeFileSync(filename, builder.buildObject({ metadata: { 'custom-type': [customType] } }));
        } else {
            groups.forEach((group: GroupDefinition) => {
                const groupId = group['$']['group-id'];

                const attributeIdsInGroup = group.attribute?.map(attr => attr['$']['attribute-id']) || [];
                const allAttributes: AttributeDefinition[] = customType['attribute-definitions']?.[0]?.['attribute-definition'] || [];

                const filteredAttributeDefinitions = allAttributes.filter(attr =>
                    attributeIdsInGroup.includes(attr['$']['attribute-id'])
                );

                const filename = path.join(destinationFolder, `custom-object.${typeId}.${groupId}.xml`);
                const exportData = {
                    metadata: {
                        'custom-type': [
                            {
                                '$': { 'type-id': typeId },
                                'attribute-definitions': [
                                    { 'attribute-definition': filteredAttributeDefinitions }
                                ],
                                'group-definitions': [{ 'attribute-group': [group] }],
                            },
                        ],
                    },
                };

                fs.writeFileSync(filename, builder.buildObject(exportData));
            });
        }
    });

    vscode.window.showInformationMessage('Custom Types and Groups exported.');
}


export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('sfcc-meta-object-manager.replaceSystemObjectType', () => updateWholeTypeExtension(context)));
    context.subscriptions.push(vscode.commands.registerCommand('sfcc-meta-object-manager.updateSystemObjectAttributesAndGroups', () => updateDetailedTypeExtension(context)));
    context.subscriptions.push(vscode.commands.registerCommand('sfcc-meta-object-manager.exportTypeExtensions', () => splitByTypeExtensions(context)));
    context.subscriptions.push(vscode.commands.registerCommand('sfcc-meta-object-manager.exportTypeExtensionsAndGroups', () => splitByTypeAndGroups(context)));
    context.subscriptions.push(vscode.commands.registerCommand('sfcc-meta-object-manager.replaceCustomObjectType', () => replaceCustomObjectType(context)));
    context.subscriptions.push(vscode.commands.registerCommand('sfcc-meta-object-manager.updateCustomObjectAttributesAndGroups', () => updateCustomObjectAttributesAndGroups(context)));
    context.subscriptions.push(vscode.commands.registerCommand('sfcc-meta-object-manager.exportCustomTypes', () => splitByCustomType(context)));
    context.subscriptions.push(vscode.commands.registerCommand('sfcc-meta-object-manager.exportCustomTypesAndGroups', () => splitByCustomTypeAndGroups(context)));
}
