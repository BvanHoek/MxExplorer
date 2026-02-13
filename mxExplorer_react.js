javascript: (() => {
    let mxExplorer = {};
    mxExplorer.version = "1.3.0";
    mxExplorer.appTitle = "Mx Explorer v" + mxExplorer.version + ", created by Valcon";

    // --- FIX: replaced mx.meta.getMap() with mx.session.getConfig().metadata ---
    const metadataArray = mx.session.getConfig().metadata;
    mxExplorer.entities = {};
    metadataArray.forEach(entityMeta => {
        mxExplorer.entities[entityMeta.objectType] = {
            getAttributes: () => Object.keys(entityMeta.attributes),
            getAttributeType: (attr) => entityMeta.attributes[attr]?.type ?? '',
            getReferenceAttributes: () => Object.keys(entityMeta.attributes).filter(a =>
                entityMeta.attributes[a].type === 'ObjectReference' ||
                entityMeta.attributes[a].type === 'ObjectReferenceSet'
            ),
            getSelectorEntity: (attr) => entityMeta.attributes[attr]?.klass ?? '',
            isObjectReferenceSet: (attr) => entityMeta.attributes[attr]?.type === 'ObjectReferenceSet',
            getSubEntities: () => entityMeta.properties?.subclasses ?? [],
            getSuperEntities: () => entityMeta.properties?.superclasses ?? [],
            isPersistable: () => entityMeta.persistable
        };
    });
    // --- END FIX ---

    mxExplorer.entityKeys = Object.keys(mxExplorer.entities);
    mxExplorer.associations = new Map;
    loadAssociations();
    mxExplorer.npEntityArray = [];
    mxExplorer.entityLoadCount = 0;
    const shadowHost = document.createElement('div');
    document.body.appendChild(shadowHost);
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
    mxExplorer.body = shadowRoot;
    mxExplorer.head = shadowRoot; // Reference to shadowRoot so app styling does not effect the tool
    mxExplorer.shadowHost = shadowHost;
    mxExplorer.zIndex = 1e3;
    mxExplorer.amount = 10;
    mxExplorer.browseEntitiesModel = null;
    mxExplorer.browseCacheModel = null;
    mxExplorer.browseConstantsModel = null;
    mxExplorer.modalArray = [];
    mxExplorer.navPanelHeight = 44;
    mxExplorer.modalInitialMaxHeight = 900;
    mxExplorer.resizeAreaSize = 5;
    mxExplorer.maxInitialHeight = window.innerHeight - Math.round(window.innerHeight / 3); // use innerHeight instead of screen.height for visible viewport
    mxExplorer.maxInitialWidth = window.innerWidth - Math.round(window.innerWidth / 3); // use innerWidth instead of screen.width for visible viewport
    mxExplorer.modalBorderWidth = 1;
    mxExplorer.modalContentPaddingTop = 15;
    mxExplorer.modalContentPaddingBottom = 15;
    mxExplorer.modalContentPaddingLeft = 20;
    mxExplorer.modalContentPaddingRight = 20;
    mxExplorer.modalContentCellPaddingTop = 0;
    mxExplorer.modalContentCellPaddingBottom = 0;
    mxExplorer.modalContentCellPaddingLeft = 3;
    mxExplorer.modalContentCellPaddingRight = 3;
    mxExplorer.modalContentMaxInitialHeight = mxExplorer.maxInitialHeight - mxExplorer.navPanelHeight;
    mxExplorer.modalContentMaxInitialWidth = calculateModalContentWidth(mxExplorer.maxInitialWidth);
    mxExplorer.dataGridContentMaxInitialWidth = calculateDataGridContentWidth(mxExplorer.modalContentMaxInitialWidth);
    mxExplorer.dataGridContentMaxInitialHeight = calculateDataGridContentHeight(mxExplorer.modalContentMaxInitialHeight);
    mxExplorer.dataGridTopRowPadding = 5;
    mxExplorer.dataTableMaxWidth = 1760;
    mxExplorer.dataTableMaxHeight = 580;
    // Make use of a shadow dom to not let app styling change the tool
    mxExplorer.styleTextNode = document.createTextNode(":host { all: initial; }" + "* { font-family: Arial, sans-serif; font-size: 14px; box-sizing: border-box; }" + ".mxExplorerModal.modal {" + "display: block !important;" + "width: fit-content; " + "height: fit-content;" + "position: fixed;" + "color: black;" + "background-color: rgba(255,255,255); /* Black w/ opacity */" + "border-style: solid;" + "border-width: " + mxExplorer.modalBorderWidth + "px;" + "border-color: rgba(0,0,0,.2);" + "border-radius: 4px;" + "overflow: hidden;}" + ".mxExplorerModal .modalTitle, .mxExplorerModal .collapsibleTitle {user-select: none;}" + ".mxExplorerModal .hidden {display: none;}" + ".mxExplorerModal a {color: blue;" + "cursor: pointer;}" + ".mxExplorerModal .cell {" + "vertical-align: middle;" + "display: table-cell;" + "height: inherit;" + "width: inherit;}" + ".mxExplorerModal .modalContent {" + "overflow: auto;" + "display: block;" + "padding: " + mxExplorer.modalContentPaddingTop + "px " + mxExplorer.modalContentPaddingRight + "px " + mxExplorer.modalContentPaddingBottom + "px " + mxExplorer.modalContentPaddingLeft + "px;}" + ".mxExplorerModal .modalContent .cell {" + "padding: " + mxExplorer.modalContentCellPaddingTop + "px " + mxExplorer.modalContentCellPaddingRight + "px " + mxExplorer.modalContentCellPaddingBottom + "px " + mxExplorer.modalContentCellPaddingLeft + "px;}" + ".mxExplorerModal .modalHeader {" + "height: " + mxExplorer.navPanelHeight + "px;" + "padding: 15px 0px 15px 20px;" + "display: flex;" + "justify-content: space-between;" + "align-items: center;" + "text-align: left;" + "border-bottom-style: solid;" + "border-bottom-width: 1px;" + "border-color: rgba(0,0,0,0.2);}" + ".mxExplorerModal .modalTitle.label {" + "color: rgb(102, 102, 102);}" + ".mxExplorerModal .navigationPanel {" + "height: " + mxExplorer.navPanelHeight + "px;" + "top: 0;" + "right: 0;}" + ".mxExplorerModal .navigationButton {" + "background: white;" + "padding: 0px;" + "width: 40px;" + "color: rgb(102,102,102);" + "border: none;" + "border-bottom-style: solid;" + "border-bottom-width: 1px;" + "border-bottom-color: rgba(0,0,0,0.2);" + "border-radius: 0px;" + "height: 44px;}" + ".mxExplorerModal .table {" + "margin: 0px;" + "display: table;}" + ".mxExplorerModal .flex {display: flex;}" + ".mxExplorerModal .row {" + "display: table-row;" + "margin-right: 0px;" + "margin-left: 0px;}" + ".mxExplorerModal .row .step {margin-left: 15px;}" + ".mxExplorerModal .col {" + "display: table-column;" + "padding-inline: 0px;}" + ".mxExplorerModal .cellContent {overflow-wrap: break-word;}" + ".mxExplorerModal .label {" + "font-weight: bold;" + "padding: 0px;" + "color: rgb(51,51,51);}" + ".mxExplorerModal input {" + "padding-right: 5px;" + "width: 100%;}" + ".mxExplorerModal .tableColumn {" + "border-width: 1px;" + "border-style: solid;" + "padding: 5px;" + "overflow: auto;" + "max-width: 250px;}" + ".mxExplorerModal .dataGridTopRow {" + "padding: " + mxExplorer.dataGridTopRowPadding + "px;" + "justify-content: space-between;}" + ".mxExplorerModal .dataGridNavigationRow {" + "padding: 5px;" + "justify-content: center;}" + ".mxExplorerModal .evenRow {background: rgba(0,0,0,0.05);}" + ".mxExplorerModal .sortingText {" + "padding-inline: 5px;" + "line-height: 26px;}" + ".mxExplorerModal .sortingContainer {" + "justify-content: space-between;" + "border-style: solid;" + "border-width: 1px;" + "border-color: rgb(231,231,233);" + "padding: 8px;" + "border-radius: 4px;}" + ".mxExplorerModal .sortingContainer button{" + "background: none;" + "border: none;" + "padding: 0px 5px;}" + ".mxExplorerModal .sortingContainer button:hover{" + "background: none;" + "border: none;}" + ".mxExplorerModal .sortButton {" + "background: inherit;" + "border: none;" + "padding: 0px 5px;" + "line-height: 26px;}" + ".mxExplorerModal .headerColumnLabel {line-height: 26px;}" + ".mxExplorerModal .dataTable {" + "display: block !important;" + "overflow: auto;}" + ".mxExplorerModal .dataCell {white-space: nowrap}" + ".mxExplorerModal .dropTarget {width: 5px;}" + ".mxExplorerModal .dragOver {width: 50px;}" + ".mxExplorerModal .singleSortingAttribute {padding-left: 5px;}" + ".mxExplorerModal .searchButtonCell {width: 70px;}" + ".mxExplorerModal .dataGridContainer {" + "display: block; " + "overflow: auto;}" + ".mxExplorerModal .valign-t {vertical-align: top;}" + ".mxExplorerModal .padding-r-5 {padding-right: 5px;}" + ".mxExplorerModal .talign-r {text-align: right;}" + ".mxExplorerModal .miniButton {" + "padding: 0px 5px;" + "background: none;" + "border: none;}" + ".mxExplorerModal .table .table {background-color: inherit;}" + ".mxExplorerModal a {" + "color: rgb(172, 139, 255);}" + ".mxExplorerModal a:hover {" + "color: rgb(118, 62, 255)}" + ".mxExplorerModal button {" + "border-style: solid;" + "border-width: 1px;" + "border-color: rgb(231,231,233);" + "border-radius: 8px;" + "color: rgb(154,113,255);" + "padding: 8.4px 14px;" + "background-color: rgb(255,255,255);}" + ".mxExplorerModal button:hover {" + "background-color: rgb(231,231,233);}" + ".mxExplorerModal .padding-inline {" + "padding-inline: 10px !important;}" + ".mxExplorerModal .button-panel {" + "margin-left: 5px;" + "display: flex;" + "flex-direction: row;" + "flex-wrap: wrap;" + "width: 250px;}" + ".mxExplorerModal .button-panel button {" + "margin-bottom: 5px;}" + ".mxExplorerModal .fitContent {" + "width: fit-content;" + "height: fit-content;}" + ".mxExplorerModal .green {color: green;}" + ".mxExplorerModal .red {color: red;}");
    mxExplorer.style = document.createElement("style");
    mxExplorer.style.appendChild(mxExplorer.styleTextNode);
    mxExplorer.head.appendChild(mxExplorer.style);
    loadNPEntities();

    function afterLoadNPEntities() {
        mxExplorer.modal = addModalClosableDraggable(mxExplorer.body, mxExplorer.appTitle, false, true);
        // Close handler adjusted so it closes the shadowhost
        mxExplorer.modal.closeButton.addEventListener("click", event => {
            event.stopPropagation();
            document.body.removeChild(mxExplorer.shadowHost);
            mxExplorer = null
        });
        mxExplorer.modalContentTable = addTable(mxExplorer.modal.contentCell);
        mxExplorer.headerRow = addRow(mxExplorer.modalContentTable, false);
        mxExplorer.headerColumn = addCell(mxExplorer.headerRow);
        mxExplorer.headerTable = addTable(mxExplorer.headerColumn);
        mxExplorer.headerTableRow = addRow(mxExplorer.headerTable, false);
        mxExplorer.headerTableColumn = addCell(mxExplorer.headerTableRow);
        mxExplorer.infoTable = addTable(mxExplorer.headerTableColumn);
        mxExplorer.contentRow = addRow(mxExplorer.modalContentTable, false);
        mxExplorer.contentColumn = addCell(mxExplorer.contentRow);
        mxExplorer.contentTable = addTable(mxExplorer.contentColumn);
        addLabelObject(mxExplorer.infoTable, "Use this link to logout", createClickableLink("Logout", () => {
            mx.logout()
        }));
        addLabelValue(mxExplorer.infoTable, "Mendix version", mx.version);
        addClass(addLabelValue(mxExplorer.infoTable, "User", mx.session.getConfig().user.attributes.Name.value), "evenRow");
        addLabelValue(mxExplorer.infoTable, "User GUID", mx.session.getUserId());
        addClass(addLabelValue(mxExplorer.infoTable, "User roles", splitArrayToString(mx.session.getUserRoleNames())), "evenRow");
        addLabelValue(mxExplorer.infoTable, "User is guest", mx.session.isGuest());
        if (typeof mx.ui.getContentForm === 'function') {
            addClass(addLabelValue(mxExplorer.infoTable, "Current page", mx.ui.getContentForm().path), "evenRow");  // check if it is Dojo or React client. (mx.ui.getContentForm() is only available in Dojo)
        }
        mxExplorer.browseEntitiesRow = addRow(mxExplorer.contentTable);
        mxExplorer.browseEntitiesCell = addCell(mxExplorer.browseEntitiesRow);
        mxExplorer.browseEntitiesLink = addLink(mxExplorer.browseEntitiesCell, "Browse entities");
        mxExplorer.browseEntitiesLink.addEventListener("click", browseEntityLinkOnClick);
        mxExplorer.browseCacheRow = addRow(mxExplorer.contentTable);
        mxExplorer.browseCacheCell = addCell(mxExplorer.browseCacheRow);
        mxExplorer.browseCacheLink = addLink(mxExplorer.browseCacheCell, "Browse cache");
        mxExplorer.browseCacheLink.addEventListener("click", browseCacheLinkOnClick);
        mxExplorer.browseConstansRow = addRow(mxExplorer.contentTable);
        mxExplorer.browseConstansCell = addCell(mxExplorer.browseConstansRow);
        mxExplorer.browseConstansLink = addLink(mxExplorer.browseConstansCell, "Browse constants");
        mxExplorer.browseConstansLink.addEventListener("click", browseConstantsLinkOnClick);
        mxExplorer.entityRows = new Map;
        mxExplorer.modal.style.zIndex = 1e6;
        initModal(mxExplorer.modal, true)
    }

    function browseEntityLinkOnClick(event) {
        if (mxExplorer.browseEntitiesModel) {
            mxExplorer.browseEntitiesModel.style.zIndex = ++mxExplorer.zIndex;
            if (mxExplorer.browseEntitiesModel.minified) {
                removeHiddenClass(mxExplorer.browseEntitiesModel.contentRow);
                mxExplorer.browseEntitiesModel.minified = false
            }
        } else {
            addBrowseEntitiesModel()
        }
        event.stopPropagation()
    }

    function browseCacheLinkOnClick(event) {
        if (mxExplorer.browseCacheModel) {
            // FIX: was ++zIndex (missing mxExplorer.)
            mxExplorer.browseCacheModel.style.zIndex = ++mxExplorer.zIndex;
            if (mxExplorer.browseCacheModel.minified) {
                removeHiddenClass(mxExplorer.browseCacheModel.contentRow);
                mxExplorer.browseCacheModel.minified = false
            }
        } else {
            addBrowseCacheModel()
        }
        event.stopPropagation()
    }

    function browseConstantsLinkOnClick(event) {
        if (mxExplorer.browseConstantsModel) {
            // FIX: was ++zIndex (missing mxExplorer.)
            mxExplorer.browseConstantsModel.style.zIndex = ++mxExplorer.zIndex;
            if (mxExplorer.browseConstantsModel.minified) {
                removeHiddenClass(mxExplorer.browseConstantsModel.contentRow);
                mxExplorer.browseConstantsModel.minified = false
            }
        } else {
            addBrowseConstantsModel()
        }
        event.stopPropagation()
    }

    function addBrowseEntitiesModel() {
        mxExplorer.browseEntitiesModel = new addModalClosableDraggable(mxExplorer.body, "Browse entities");
        const contentTable = addTable(mxExplorer.browseEntitiesModel.contentCell);
        const searchRow = addRow(contentTable);
        const searchRowCell = addCell(searchRow);
        const searchRowTable = addTable(searchRowCell);
        const searchRowTableRow = addRow(searchRowTable);
        const searchRowTableLabelCell = addCell(searchRowTableRow);
        addLabel(searchRowTableLabelCell, "Filter entities");
        const searchRowTableSearchFieldCell = addCell(searchRowTableRow);
        const searchField = addInputField(searchRowTableSearchFieldCell);
        searchField.focus();
        searchField.addEventListener("keyup", event => {
            searchEntities(searchField.value.toLowerCase())
        });
        const searchRowTableResetSearchButtonCell = addCell(searchRowTableRow);
        addClickableButton(searchRowTableResetSearchButtonCell, "Clear", event => {
            searchField.value = "";
            searchEntities("")
        });
        const entitiesRow = addRow(contentTable);
        const entitiesCell = addCell(entitiesRow);
        const entitiesContainer = addContentContainer(entitiesCell);
        addEntities(addTable(entitiesContainer));
        initModal(mxExplorer.browseEntitiesModel);
        setComponentHeightInPixels(entitiesContainer, contentTable.style.offsetHeight - (searchRow.style.offsetHeight + mxExplorer.modalContentPaddingTop + mxExplorer.modalContentPaddingBottom))
    }

    function addBrowseCacheModel() {
        mxExplorer.browseCacheModel = new addModalClosableDraggable(mxExplorer.body, "Browse cache");
        const contentTable = addTable(mxExplorer.browseCacheModel.contentCell);
        const refreshButtonRow = addRow(contentTable);
        const refreshButtonCell = addCell(refreshButtonRow);
        const cacheRow = addRow(contentTable);
        const cacheCell = addCell(cacheRow);
        const cacheContainer = addContainer(cacheCell);
        addClass(cacheContainer, "contentContainer");
        let cacheTable = addTable(cacheContainer);
        addClickableButton(refreshButtonCell, "Refresh", event => {
            cacheContainer.removeChild(cacheTable);
            cacheTable = addTable(cacheContainer);
            addCacheContainerContent(cacheTable)
        });
        addCacheContainerContent(cacheTable);
        initModal(mxExplorer.browseCacheModel)
    }

    function addBrowseConstantsModel() {
        mxExplorer.browseConstantsModel = new addModalClosableDraggable(mxExplorer.body, "Browse constants");
        const contentTable = addTable(mxExplorer.browseConstantsModel.contentCell);
        const constantsRow = addRow(contentTable);
        const constantsCell = addCell(constantsRow);
        const constantsContainer = addContainer(constantsCell);
        addClass(constantsContainer, "contentContainer");
        let constantsTable = addTable(constantsContainer);
        addConstantsTableContent(constantsTable);
        initModal(mxExplorer.browseConstantsModel)
    }

    function addEntities(entitiesTable) {
        mxExplorer.entityKeys.sort();
        let entityCounter = 1;
        mxExplorer.entityKeys.forEach(function(item, index) {
            addEntity(item, entitiesTable, entityCounter++)
        })
    }

    function addCacheContainerContent(contentTable) {
        let entityCounter = 1;
        window.mx.data.getObjectsStatistics().forEach(function(item, index) {
            addClientCacheEntry(item, contentTable, entityCounter++)
        })
    }

    function addConstantsTableContent(contentTable) {
        let entityCounter = 1;
        // FIX: was window.mx.session.sessionData.constants
        mx.session.getConfig().constants.forEach(function(item, index) {
            addConstantsEntry(item, contentTable, entityCounter++)
        })
    }

    function addClientCacheEntry(item, table, entityCounter, showEntity = true) {
        const row = addRow(table, false);
        if (entityCounter % 2 === 0) {
            addClass(row, "evenRow")
        }
        const guidCell = addCell(row);
        const link = addLink(guidCell, item.guid);
        link.item = item;
        link.addEventListener("click", function(event) {
            addDataPage(this.item.object, this.item.object.getAttributes());
            event.stopPropagation()
        });
        if (showEntity) {
            const entityCell = addCell(row);
            addLabel(entityCell, item.object.getEntity())
        }
    }

    function addConstantsEntry(item, table, entityCounter) {
        const row = addLabelValue(table, item.name, item.value);
        if (entityCounter % 2 === 0) {
            addClass(row, "evenRow")
        }
    }

    function addEntity(entityKey, entitiesTable, entityCounter) {
        const entityRow = addRow(entitiesTable, false);
        if (entityCounter % 2 === 0) {
            addClass(entityRow, "evenRow")
        }
        mxExplorer.entityRows.set(entityKey, entityRow);
        const linkCell = addCell(entityRow);
        const entityLink = addLink(linkCell, entityKey);
        entityLink.entity = entityKey;
        entityLink.row = entityRow;
        entityLink.entitiesTable = entitiesTable;
        entityLink.addEventListener("click", entityLinkOnClick);
        const buttonCell = addCell(entityRow);
        addClass(buttonCell, "searchButtonCell");
        if (mxExplorer.npEntityArray.includes(entityKey)) {
            addLabel(buttonCell, "NP")
        } else {
            addSearchLink(buttonCell, entityKey)
        }
    }

    function addSearchLink(parent, entity) {
        const searchLink = addLink(parent, "Search");
        searchLink.entity = entity;
        searchLink.attributesParam = mxExplorer.entities[entity].getAttributes();
        searchLink.addEventListener("click", searchLinkOnClick)
    }

    function entityLinkOnClick() {
        this.open = !this.open;
        if (this.open) {
            const entityContentRow = addRowAfter(this.row);
            const attributeColumn = addCell(entityContentRow);
            this.entityContentRow = entityContentRow;
            const entityObject = mxExplorer.entities[this.entity];
            const attributes = entityObject.getAttributes();
            addEntityAttributePanel(attributeColumn, this.entity, attributes);
            addCell(entityContentRow)
        } else {
            if (this.entityContentRow) {
                this.entitiesTable.removeChild(this.entityContentRow)
            }
        }
    }

    function addEntityAttributePanel(attributeColumn, entityName, attributes) {
        const panel = addTableNoMargin(attributeColumn);
        const entity = mxExplorer.entities[entityName];
        attributes.forEach(attribute => {
            let row = addRow(panel, true);
            let column = addCell(row);
            let writeAccess = true;
            // FIX: was mx.session.sessionData.metadata
            mx.session.getConfig().metadata.every(entityMeta => {
                if (entityMeta.objectType === entityName) {
                    const attributeObject = entityMeta.attributes[attribute];
                    if (attributeObject && attributeObject.readonly !== undefined && attributeObject.readonly) {
                        writeAccess = false
                    }
                    return false
                }
                return true
            });
            const label = addTextNode(column, attribute + " (" + entity.getAttributeType(attribute) + ")");
            if (writeAccess) {
                addClass(column, "green")
            } else {
                addClass(column, "red")
            }
        });
        return panel
    }

    function searchLinkOnClick(event) {
        event.stopPropagation();
        const parentAttributes = this.attributesParam;
        const entity = this.entity;
        const dataModal = addModalClosableDraggable(mxExplorer.body, entity);
        addDataGrid(dataModal.contentCell, parentAttributes, entity, mxExplorer.amount, 0, "", [], "", false, dataModal)
    }

    function addLabelObject(table, labelParam, object) {
        const row = addRow(table, false);
        const labelColumn = addCell(row);
        addLabel(labelColumn, labelParam + ":");
        const objectCell = addCell(row);
        objectCell.appendChild(object);
        return row
    }

    function addLabelValue(table, labelParam, valueParam) {
        const valueContainer = createContainer();
        addClass(valueContainer, "cellContent");
        addTextNode(valueContainer, valueParam);
        const row = addLabelObject(table, labelParam, valueContainer);
        return row
    }


    function addLabelAttributeToContainer(table, labelParam, valueParam, attribute, entityObject) {
        const row = addRow(table, false);
        const labelColumn = addCell(row);
        addLabel(labelColumn, labelParam + ":");
        const valueColumn = addCell(row);
        addValueElement(valueColumn, valueParam, attribute, entityObject);
        return row
    }

    function addValueElement(column, valueParam, attribute, entityObject) {
        if (entityObject.getAttributeType(attribute) === "ObjectReference" && valueParam !== "") {
            addObjectReferenceLink(column, valueParam, attribute, entityObject)
        } else if (entityObject.getAttributeType(attribute) === "ObjectReferenceSet" && valueParam !== "") {
            valueParam.forEach(entry => {
                addObjectReferenceLink(column, entry, attribute, entityObject)
            })
        } else {
            const textNode = addTextNode(column, valueParam);
            textNode.objectReference = false;
            return textNode
        }
    }

    function addObjectReferenceLink(column, valueParam, attribute, entityObject) {
        const link = addLink(column, valueParam);
        link.addEventListener("click", () => {
            mxDataGetEntry(valueParam, entry => {
                return addDataPage(entry, mxExplorer.entities[entry.getEntity()].getAttributes())
            }, error => {
                window.alert("Could not execute query, error: " + error.status)
            })
        });
        link.objectReference = true;
        return link
    }

    function addCell(parent) {
        const cell = addContainer(parent);
        addClasses(cell, ["cell"]);
        return cell
    }

    function createContainer() {
        const container = document.createElement("div");
        return container
    }

    function addContainer(parent) {
        const container = createContainer();
        parent.appendChild(container);
        return container
    }

    function addContentContainer(parent) {
        const container = addContainer(parent);
        addClass(container, "contentContainer");
        return container
    }

    function addContainerAfter(peer) {
        const column = document.createElement("div");
        peer.after(column);
        return column
    }

    function addFlex(parent) {
        const flex = addContainer(parent);
        addClass(flex, "flex");
        return flex
    }

    function addLinkedCell(parent, content, onClick) {
        const cell = addCell(parent);
        const link = addLink(cell, content);
        link.addEventListener("click", onClick);
        return cell
    }

    function addRow(parent, step) {
        const row = addContainer(parent);
        addClass(row, "row");
        if (step) {
            addClass(row, "step")
        }
        return row
    }

    function addRowAfter(peer, step) {
        const row = addContainerAfter(peer);
        addClass(row, "row");
        if (step) {
            addClass(row, "step")
        }
        return row
    }

    function addTableNoMargin(parent) {
        const table = addTable(parent);
        addAttributeValue(table, "style", "margin: 0px;");
        return table
    }

    function addTable(parent) {
        const table = addContainer(parent);
        addClass(table, "table");
        return table
    }

    function addText(parent, textparam) {
        const text = addContainer(parent);
        addClass(text, "text");
        addTextNode(text, textparam);
        return text
    }

    function addTextNode(parent, text) {
        const textNode = document.createTextNode(text);
        parent.appendChild(textNode);
        return textNode
    }

    function addAttributeValue(object, attribute, value) {
        if (object.getAttribute(attribute)) {
            object.setAttribute(attribute, object.getAttribute(attribute) + value)
        } else {
            object.setAttribute(attribute, value)
        }
    }

    function addInputField(parent) {
        const input = document.createElement("input");
        input.type = "text";
        parent.appendChild(input);
        return input
    }

    function addTextArea(parent, columns = 50, rows = 4) {
        const textArea = document.createElement("textarea");
        textArea.rows = rows;
        textArea.cols = columns;
        parent.appendChild(textArea);
        return textArea
    }

    function createLink(text) {
        const link = document.createElement("a");
        addTextNode(link, text);
        return link
    }

    function addLink(parent, text) {
        const link = createLink(text);
        parent.appendChild(link);
        return link
    }

    function createClickableLink(text, onClick) {
        const link = createLink(text);
        link.addEventListener("click", onClick);
        return link
    }

    function addClickableLink(parent, text, onClick) {
        const link = createClickableLink(text, onClick);
        parent.appendChild(link);
        return link
    }

    function addLabel(parent, labelParam) {
        const label = addContainer(parent);
        addClass(label, "label");
        addTextNode(label, labelParam);
        return label
    }

    function addButton(parent, text) {
        const button = document.createElement("button");
        addTextNode(button, text);
        addAttributeValue(button, "type", "button");
        parent.appendChild(button);
        return button
    }

    function addClickableButton(parent, text, onClick) {
        const button = addButton(parent, text);
        button.addEventListener("click", onClick)
    }

    function addResizableModal(parent, title) {
        const modal = addContainer(parent);
        mxExplorer.modalArray.push(modal);
        addClasses(modal, ["table", "modal"]);
        addClass(modal, "mxExplorerModal");
        const modalTable = addTable(modal);
        const topRow = addRow(modalTable);
        const topleft = addCell(topRow);
        addClass(topleft, "fitContent");
        addResizeContainer(topleft, "nwse-resize", true, true, modal, "tl");
        const topCenter = addCell(topRow);
        addClass(topCenter, "fitContent");
        addResizeContainer(topCenter, "ns-resize", true, false, modal, "t");
        const topRight = addCell(topRow);
        addClass(topRight, "fitContent");
        addResizeContainer(topRight, "nesw-resize", true, true, modal, "tr");
        const centerRow = addRow(modalTable);
        const centerleft = addCell(centerRow);
        addClass(centerleft, "fitContent");
        const centerLeftResizeContainer = addResizeContainer(centerleft, "ew-resize", false, true, modal, "l");
        addResizeCenterSidesStyling(centerLeftResizeContainer);
        const centerCenter = addCell(centerRow);
        const centerRight = addCell(centerRow);
        addClass(centerRight, "fitContent");
        const centerRightResizeContainer = addResizeContainer(centerRight, "ew-resize", false, true, modal, "r");
        addResizeCenterSidesStyling(centerRightResizeContainer);
        const bottomRow = addRow(modalTable);
        const bottomleft = addCell(bottomRow);
        addClass(bottomleft, "fitContent");
        addResizeContainer(bottomleft, "nesw-resize", true, true, modal, "bl");
        const bottomCenter = addCell(bottomRow);
        addClass(bottomCenter, "fitContent");
        addResizeContainer(bottomCenter, "ns-resize", true, false, modal, "b");
        const bottomRight = addCell(bottomRow);
        addClass(bottomRight, "fitContent");
        addResizeContainer(bottomRight, "nwse-resize", true, true, modal, "br");
        const contentTable = addTable(centerCenter);
        modal.headerRow = addRow(contentTable);
        const headerCell = addCell(modal.headerRow);
        modal.headerContainer = addFlex(headerCell);
        addClass(modal.headerContainer, "modalHeader");
        const titleLabel = addLabel(modal.headerContainer, title);
        addAttributeValue(titleLabel, "class", " modalTitle");
        modal.navigationPanel = addContainer(modal.headerContainer);
        addClass(modal.navigationPanel, "navigationPanel");
        const contentRow = addRow(contentTable);
        modal.contentRow = contentRow;
        modal.contentCell = addCell(contentRow);
        modal.contentCell.modal = modal;
        addClass(modal.contentCell, "modalContent");
        return modal
    }

    function calculateModalLocation(event, modal, usePreviousDrag) {
        const startX = usePreviousDrag ? modal.previousDragX : modal.dragStartX;
        const startY = usePreviousDrag ? modal.previousDragY : modal.dragStartY;
        if (startX != event.x || startY != event.y) {
            const maxX = window.innerWidth - modal.offsetWidth;
            modal.newX = modal.x + (event.x - startX);
            modal.newX = modal.newX > 0 ? modal.newX : 0;
            modal.newX = modal.newX < maxX ? modal.newX : maxX;
            modal.style.left = modal.newX + "px";
            const maxY = window.innerHeight - modal.offsetHeight;
            modal.newY = modal.y + (event.y - startY);
            modal.newY = modal.newY > 0 ? modal.newY : 0;
            modal.newY = modal.newY < maxY ? modal.newY : maxY;
            modal.style.top = modal.newY + "px";
            modal.x = modal.newX;
            modal.y = modal.newY
        }
    }

    function addModalClosableDraggable(parent, title, defaultCloseBehaviour = true) {
        const modal = addResizableModal(parent, title);
        modal.minified = false;
        bringToFront(modal);
        addAttributeValue(modal.headerRow, "draggable", "true");
        modal.headerRow.addEventListener("mousedown", event => {
            modal.dragStartX = event.x;
            modal.dragStartY = event.y;
            modal.previousDragX = event.x;
            modal.previousDragY = event.y
        });
        modal.headerRow.addEventListener("dragend", event => {
            calculateModalLocation(event, modal, false);
            bringToFront(modal)
        });
        const minifyButton = addButton(modal.navigationPanel, "⎯");
        modal.minifyButton = minifyButton;
        addClass(minifyButton, "navigationButton");
        minifyButton.addEventListener("click", event => {
            if (modal.minified) {
                removeHiddenClass(modal.contentRow);
                modal.minified = false;
                modal.style.height = modal.oldHeight
            } else {
                addHiddenClass(modal.contentRow);
                modal.minified = true;
                modal.oldHeight = modal.style.height;
                modal.style.height = "55px"
            }
        });
        const closeButton = addButton(modal.navigationPanel, "X");
        modal.closeButton = closeButton;
        addClass(closeButton, "navigationButton");
        if (defaultCloseBehaviour) {
            closeButton.addEventListener("click", event => {
                event.stopPropagation();
                mxExplorer.body.removeChild(modal);
                delete mxExplorer.modalArray[mxExplorer.modalArray.indexOf(modal)];
                if (modal === mxExplorer.browseEntitiesModel) {
                    mxExplorer.browseEntitiesModel = null
                } else if (modal === mxExplorer.browseCacheModel) {
                    mxExplorer.browseCacheModel = null
                }
            })
        }
        modal.addEventListener("click", () => {
            bringToFront(modal)
        });
        return modal
    }

    function bringToFront(object) {
        object.style.zIndex = ++mxExplorer.zIndex
    }

    function datagridSearch(modal, container, table, parentAttributes, entity, maxResult, amount, xpath, sortSpec, hiddenXpathValue, embedded, width, height) {
        container.removeChild(table);
        addDataGrid(container, parentAttributes, entity, maxResult !== null ? maxResult.value : amount, 0, xpath.value, sortSpec, hiddenXpathValue, embedded, modal)
    }

    function getDefaultMxDataGetErrorHandler() {
        return error => {
            window.alert("Could not execute query, error: " + error.status)
        }
    }

    function addDataGrid(container, parentAttributes, entity, amount, offset, xpathValue, sortSpec, hiddenXpathValue, embedded, modal) {
        const table = addTable(container);
        const topRow = addRow(table);
        modal.topRow = topRow;
        const topCell = addCell(topRow);
        const topCellContainer = addFlex(topCell);
        addClass(topCellContainer, "dataGridTopRow");
        const topLeftContainer = addContainer(topCellContainer);
        const topCenterColumn = addContainer(topCellContainer);
        const topCenterColumnTable = addTable(topCenterColumn);
        const topCenterColumnTableRow = addRow(topCenterColumnTable);
        const topCenterColumnLabelCell = addCell(topCenterColumnTableRow);
        const xpath = addTextArea(topCenterColumnLabelCell, 100);
        xpath.placeholder = "Type your xpath here, don%27t forget the []";
        xpath.addEventListener("keydown", event => {
            if (event.code === "Enter" && event.ctrlKey) {
                datagridSearch(modal, container, table, parentAttributes, entity, maxResult, amount, xpath, sortSpec, hiddenXpathValue, embedded)
            }
        });
        xpath.value = xpathValue;
        const topCenterColumnButtonPanel = addCell(topCenterColumnTableRow);
        addClass(topCenterColumnButtonPanel, "valign-t");
        addClickableButton(topCenterColumnButtonPanel, "Clear", () => {
            xpath.value = ""
        });
        addClass(topCenterColumnButtonPanel, "button-panel");
        addClickableButton(topCenterColumnButtonPanel, "[]", () => {
            xpath.value = "[]"
        });
        addClickableButton(topCenterColumnButtonPanel, "OR", () => {
            addTextToInputField(xpath, " or ")
        });
        addClickableButton(topCenterColumnButtonPanel, "AND", () => {
            addTextToInputField(xpath, " and ")
        });
        addClickableButton(topCenterColumnButtonPanel, "(", () => {
            addTextToInputField(xpath, "(")
        });
        addClickableButton(topCenterColumnButtonPanel, ")", () => {
            addTextToInputField(xpath, ")")
        });
        addClickableButton(topCenterColumnButtonPanel, "empty", () => {
            addTextToInputField(xpath, "empty")
        });
        addClickableButton(topCenterColumnButtonPanel, "Search", () => {
            datagridSearch(modal, container, table, parentAttributes, entity, maxResult, amount, xpath, sortSpec, hiddenXpathValue, embedded)
        });
        const topRightContainer = addContainer(topCellContainer);
        addAttributeValue(topRightContainer, "style", "text-align: right");
        const sortingRow = addRow(table);
        modal.sortingRow = sortingRow;
        const sortingCell = addCell(sortingRow);
        const sortingContainer = addFlex(sortingCell);
        if (sortSpec && sortSpec.length === 0) {
            addText(sortingContainer, "No Sorting")
        }
        table.addEventListener("sort", event => {
            event.stopPropagation();
            let sortFound = false;
            if (sortSpec) {
                sortSpec.every(sort1 => {
                    if (sort1[0] === event.attribute) {
                        if (sort1[1] === "asc") {
                            sort1[1] = "desc"
                        } else {
                            sort1[1] = "asc"
                        }
                        sortFound = true;
                        return false
                    }
                    return true
                })
            }
            if (!sortFound) {
                sortSpec[sortSpec.length] = [event.attribute, "asc"]
            }
            container.removeChild(table);
            addDataGrid(container, parentAttributes, entity, maxResult !== null ? maxResult.value : amount, 0, xpath.value, sortSpec, hiddenXpathValue, embedded, modal)
        });
        table.addEventListener("removeSort", event => {
            let count = 0;
            sortSpec.every(sort2 => {
                if (sort2[0] === event.attribute) {
                    sortSpec.splice(count, 1);
                    return false
                }
                count++;
                return true
            });
            container.removeChild(table);
            addDataGrid(container, parentAttributes, entity, maxResult !== null ? maxResult.value : amount, 0, xpath.value, sortSpec, hiddenXpathValue, embedded, modal)
        });
        let maxResult = null;
        let count = 0;
        if (sortSpec && sortSpec.length > 0) {
            if (sortSpec.length === 1) {
                addClass(sortingContainer, "singleSortingAttribute")
            } else {
                addDropTarget(sortingContainer, count, sortSpec, container, table, parentAttributes, entity, maxResult !== null ? maxResult.value : amount, 0, xpath.value, hiddenXpathValue, embedded, modal)
            }
            sortSpec.forEach(sort => {
                addSortingAttribute(sortingContainer, sort[0], sort[1], count++);
                if (sortSpec.length > 1) {
                    addDropTarget(sortingContainer, count, sortSpec, container, table, parentAttributes, entity, maxResult !== null ? maxResult.value : amount, 0, xpath.value, hiddenXpathValue, embedded, modal)
                }
            })
        }
        const dataRow = addRow(table);
        const dataCell = addCell(dataRow);
        const dataContainer = addContainer(dataCell);
        addClass(dataContainer, "dataGridContent");
        modal.dataGridContent = dataContainer;
        const navigationRow = addRow(table);
        modal.navigationRow = navigationRow;
        const navigationCell = addCell(navigationRow);
        const navigationContainer = addFlex(navigationCell);
        addClass(navigationContainer, "dataGridNavigationRow");
        addCell(navigationContainer);
        const navigationCenterColumn = addCell(navigationContainer);
        addCell(navigationContainer);
        const navigationCenterColumnTable = addTable(navigationCenterColumn);
        const navigationCenterColumnRow = addRow(navigationCenterColumnTable);
        addAttributeValue(navigationCenterColumnRow, "style", "justify-content: center");
        const firstPageColumn = addCell(navigationCenterColumnRow);
        const previousPageColumn = addCell(navigationCenterColumnRow);
        const nextPageColumn = addCell(navigationCenterColumnRow);
        const lastPageColumn = addCell(navigationCenterColumnRow);
        mxDataGet("//" + entity + xpath.value + hiddenXpathValue, (entries, countObject) => {
            const dataTable = addTable(dataContainer);
            modal.dataGridContent.dataTable = dataTable;
            if (!embedded) {
                addClass(dataTable, "dataTable")
            }
            dataTable.style.maxWidth = mxExplorer.dataGridContentMaxInitialWidth + "px";
            dataTable.style.maxHeight = mxExplorer.dataGridContentMaxInitialHeight + "px";
            const headerRow = addRow(dataTable);
            const count = countObject.count;
            addPaging(topLeftContainer, count, offset, amount);
            const firstPageLink = addLink(firstPageColumn, "<<");
            const previousPageLink = addLink(previousPageColumn, "<");
            const nextPageLink = addLink(nextPageColumn, ">");
            const lastPageLink = addLink(lastPageColumn, ">>");
            const totalPages = Math.ceil(count / amount);
            const currentPage = offset / amount + 1;
            maxResult = addMaxResult(topRightContainer, () => {
                container.removeChild(table);
                addDataGrid(container, parentAttributes, entity, maxResult.value, offset, xpath.value, sortSpec, hiddenXpathValue, embedded, modal)
            });
            if (currentPage != 1) {
                firstPageLink.addEventListener("click", () => {
                    container.removeChild(table);
                    addDataGrid(container, parentAttributes, entity, maxResult.value, 0, xpath.value, sortSpec, hiddenXpathValue, embedded, modal)
                });
                previousPageLink.addEventListener("click", () => {
                    container.removeChild(table);
                    addDataGrid(container, parentAttributes, entity, maxResult.value, amount * (currentPage - 2), xpath.value, sortSpec, hiddenXpathValue, embedded, modal)
                })
            }
            if (currentPage != totalPages) {
                nextPageLink.addEventListener("click", () => {
                    container.removeChild(table);
                    addDataGrid(container, parentAttributes, entity, maxResult.value, amount * currentPage, xpath.value, sortSpec, hiddenXpathValue, embedded, modal)
                });
                lastPageLink.addEventListener("click", () => {
                    container.removeChild(table);
                    addDataGrid(container, parentAttributes, entity, maxResult.value, amount * (totalPages - 1), xpath.value, sortSpec, hiddenXpathValue, embedded, modal)
                })
            }
            maxResult.value = amount;
            const guidCell = addCell(headerRow);
            guidCell.addEventListener("click", () => {
                addTextToInputField(xpath, "[id = ]")
            });
            addLabel(guidCell, "GUID");
            const entityObject = mxExplorer.entities[entity];
            parentAttributes.forEach(attribute => {
                const headerCell = addCell(headerRow);
                const headerCellContainer = addFlex(headerCell);
                const headerCellLabel = addLabel(headerCellContainer, attribute);
                addClass(headerCellLabel, "headerColumnLabel");
                if (entityObject.getAttributeType(attribute) !== "ObjectReference") {
                    const exportButton = addMiniButton(headerCellContainer, "»");
                    exportButton.attribute = attribute;
                    exportButton.xpath = xpath;
                    exportButton.sortSpec = sortSpec;
                    exportButton.entity = entity;
                    const tooltip = "Use this button to export ALL entries for this column, empty columns will no be exported";
                    exportButton.title = tooltip;
                    exportButton.alt = tooltip;
                    exportButton.addEventListener("click", function(event) {
                        event.stopPropagation();
                        exportColumn("//" + this.entity + this.xpath.value, this.attribute, this.sortSpec)
                    });
                    const sortButton = addButton(headerCellContainer, "↨");
                    addClass(sortButton, "sortButton");
                    sortButton.addEventListener("click", event => {
                        event.stopPropagation();
                        const sortEvent = new Event("sort", {
                            bubbles: true
                        });
                        sortEvent.attribute = attribute;
                        sortButton.dispatchEvent(sortEvent)
                    })
                }
                headerCell.addEventListener("click", () => {
                    if (entityObject.getAttributeType(attribute) === "ObjectReference") {
                        addTextToInputField(xpath, "[" + attribute + "/" + entityObject.getSelectorEntity(attribute) + "/ ]")
                    } else {
                        addTextToInputField(xpath, "[" + attribute + " = ]")
                    }
                })
            });
            let counter = 1;
            entries.forEach(entry => {
                const dataRow = addRow(dataTable);
                if (counter % 2 === 0) {
                    addClass(dataRow, "evenRow")
                }
                counter++;
                addLinkedCell(dataRow, entry.getGuid(), event => {
                    addDataPage(entry, parentAttributes);
                    event.stopPropagation()
                });
                parentAttributes.forEach(attribute => {
                    const value = getValue(entry, attribute, entityObject);
                    const dataCell = addCell(dataRow);
                    addClass(dataCell, "dataCell");
                    const element = addValueElement(dataCell, value, attribute, entry);
                    if (element && !element.objectReference) {
                        dataCell.addEventListener("click", () => {
                            addTextToInputField(xpath, "[" + attribute + "= %27" + value + "%27]")
                        })
                    }
                })
            });
            if (modal && !modal.initDone) {
                modal.initDone = true
            }
            if (modal !== undefined) {
                initModal(modal)
            }
        }, this.attributes, getDefaultMxDataGetErrorHandler(), offset, amount, sortSpec)
    }

    function mxDataGet(xpath, callback, attributes, error, offset, amount, sort) {
        const parameters = {
            xpath: xpath,
            callback: callback,
            error: error,
            count: true
        };
        if (!attributes || !offset || !amount || !sort) {
            const filter = {};
            if (attributes) {
                filter.attributes = attributes
            }
            if (offset) {
                filter.offset = offset
            }
            if (amount) {
                filter.amount = amount
            }
            if (sort) {
                filter.sort = sort
            }
            parameters.filter = filter
        }
        mx.data.get(parameters)
    }

    function mxDataGetEntry(guid, callback, error) {
        const parameters = {
            guid: guid,
            callback: callback,
            error: error
        };
        mx.data.get(parameters)
    }

    function getValue(entry, attribute, entityObject) {
        const value = entry.get(attribute);
        if (entry.getAttributeType(attribute) === "DateTime" && value !== "") {
            const dateTimeFormat = new Intl.DateTimeFormat("en-us", {
                year: "numeric",
                month: "numeric",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
                hour12: false
            });
            const parts = dateTimeFormat.formatToParts(new Date(value));
            return formattedDate = getDatePart(parts, "year") + "-" + getDatePart(parts, "month") + "-" + getDatePart(parts, "day") + "T" + getDatePart(parts, "hour") + ":" + getDatePart(parts, "minute") + ":" + getDatePart(parts, "second")
        } else {
            return value
        }
    }

    function getDatePart(parts, type) {
        let value = "";
        parts.forEach(part => {
            if (part.type === type) {
                value = parseInt(`${part.value}`);
                if (part.type === "hour" && value === 24) {
                    value = "00"
                } else if ((part.type === "second" || part.type === "minute" || part.type === "hour" || part.type === "day" || part.type === "month") && value < 10) {
                    value = "0" + value
                }
            }
        });
        return value
    }

    function addDataPage(entry, parentAttributes) {
        const entityName = entry.getEntity();
        const dataModal = addModalClosableDraggable(mxExplorer.body, entityName + " - GUID: " + entry.getGuid());
        const contentContainer = addContentContainer(dataModal.contentCell);
        const contentTable = addTable(contentContainer);
        const attributesRow = addRow(contentTable);
        const attributesCell = addCell(attributesRow);
        const attributeContentTable = addTable(attributesCell);
        const associationsRow = addRow(contentTable);
        const associationsCell = addCell(associationsRow);
        const associationsContentTable = addTable(associationsCell);
        let container;
        const entityObject = mxExplorer.entities[entityName];
        container = addLabelValue(attributeContentTable, "GUID", entry.getGuid());
        let attributeCounter = 2;
        parentAttributes.sort();
        parentAttributes.forEach(attribute => {
            if (!entityObject.isObjectReferenceSet(attribute)) {
                container = addLabelAttributeToContainer(attributeContentTable, attribute, getValue(entry, attribute, entityObject), attribute, entityObject);
                if (attributeCounter % 2 === 0) {
                    addClass(container, "evenRow")
                }
            } else {
                addAssociationPanel(attribute, entityObject.getSelectorEntity(attribute), associationsContentTable, attributeCounter % 2 === 0, dataModal, entry)
            }
            attributeCounter++
        });
        if (mxExplorer.associations.get(entityName)) {
            const associationsForEntity = mxExplorer.associations.get(entityName);
            const it = associationsForEntity.keys();
            let result = it.next();
            while (!result.done) {
                let key = result.value;
                if (!entityObject.getReferenceAttributes().includes(key)) {
                    const associatedEntity = associationsForEntity.get(key);
                    addAssociationPanel(key, associatedEntity, associationsContentTable, attributeCounter % 2 === 0, dataModal, entry);
                    attributeCounter++
                }
                result = it.next()
            }
        }
        initModal(dataModal)
    }

    function addAssociationPanel(association, entity, table, evenRow, modal, entry) {
        const npEntity = mxExplorer.npEntityArray.includes(entity);
        const collapsibleRow = addRow(table);
        const collapsibleCell = addCell(collapsibleRow);
        container = addContainer(collapsibleCell);
        addCollapsiblePanel(container, headerCell => {
            const titleLabel = addLabel(headerCell, association + " (Open to browse)");
            addAttributeValue(titleLabel, "class", " collapsibleTitle")
        }, contentContainer => {
            const container = addContainer(contentContainer);
            container.style.width = modal.offsetWidth - 25 + "px";
            if (npEntity) {
                const table = addTable(container);
                let hasNpObjects = false;
                window.mx.data.getObjectsStatistics().forEach((item, index) => {
                    const entityObject = item.object;
                    const entityObjectGuid = entityObject.getGuid();
                    if (entityObject.getEntity() === entity) {
                        if (getValue(entityObject, key, mxExplorer.entities[entityObject.getEntity()]) === entry.getGuid()) {
                            hasNpObjects = true;
                            const row = addRow(table);
                            const cell = addCell(row);
                            const link = addLink(cell, entityObjectGuid);
                            link.addEventListener("click", event => {
                                let objectStillInCache = false;
                                window.mx.data.getObjectsStatistics().every((item, index) => {
                                    if (item.object.getGuid() === entityObjectGuid) {
                                        objectStillInCache = true;
                                        return false
                                    }
                                    return true
                                });
                                if (objectStillInCache) {
                                    addDataPage(entityObject, entityObject.getAttributes());
                                    event.stopPropagation()
                                } else {
                                    window.alert("Item " + entityObjectGuid + " is no longer present in the cache, please refresh")
                                }
                            })
                        }
                    }
                });
                if (!hasNpObjects) {
                    const row = addRow(table);
                    const cell = addCell(row);
                    addLabel(cell, "No related np entities found")
                }
            } else {
                addClass(container, "dataGridContainer");
                addDataGrid(container, mxExplorer.entities[entity].getAttributes(), entity, mxExplorer.amount, 0, "", [], "[" + association + "=" + entry.getGuid() + "]", true, modal)
            }
        });
        addCell(collapsibleRow);
        if (evenRow) {
            addClass(collapsibleRow, "evenRow")
        }
    }

    function addPaging(navigationColumn, length, offset, amount) {
        const maxLength = +offset + +amount;
        const to = length < maxLength ? length : maxLength;
        if (length > 0) {
            addLabel(navigationColumn, offset + 1 + " to " + to + " of " + length)
        } else {
            addLabel(navigationColumn, "0 to 0 of 0")
        }
    }

    function addMaxResult(parent, onChange) {
        const select = document.createElement("select");
        addOption(select, "10");
        addOption(select, "25");
        addOption(select, "50");
        parent.appendChild(select);
        select.addEventListener("change", onChange);
        return select
    }

    function addOption(parent, value) {
        const option = document.createElement("option");
        addTextNode(option, value);
        parent.appendChild(option)
    }

    function addClasses(object, classes) {
        classes.forEach(clazz => {
            const classList = object.classList;
            if (!classList.contains(clazz)) {
                classList.add(clazz)
            }
        })
    }

    function addClass(object, clazz) {
        const classList = object.classList;
        if (!classList.contains(clazz)) {
            classList.add(clazz)
        }
    }

    function removeClass(object, clazz) {
        const classList = object.classList;
        if (classList.contains(clazz)) {
            classList.remove(clazz)
        }
    }

    function addHiddenClass(object) {
        addClass(object, "hidden")
    }

    function removeHiddenClass(object) {
        removeClass(object, "hidden")
    }

    function addSortingAttribute(parent, attribute, sortOrder, count) {
        const container = addFlex(parent);
        container.attribute = attribute;
        container.sort = sortOrder;
        container.addEventListener("dragstart", event => {
            event.dataTransfer.setData("count", count)
        });
        addClass(container, "sortingContainer");
        addAttributeValue(container, "draggable", "true");
        const removeButton = addButton(container, "X");
        removeButton.addEventListener("click", () => {
            const event = new Event("removeSort", {
                bubbles: true
            });
            event.attribute = attribute;
            container.dispatchEvent(event)
        });
        const text = addText(container, attribute);
        addClass(text, "sortingText");
        const descButton = addButton(container, "↓");
        addClass(descButton, "sortingButton");
        const ascButton = addButton(container, "↑");
        addClass(ascButton, "sortingButton");
        if (sortOrder === "desc") {
            addHiddenClass(ascButton)
        } else {
            addHiddenClass(descButton)
        }
        descButton.addEventListener("click", () => {
            addHiddenClass(descButton);
            removeHiddenClass(ascButton);
            container.sort = "asc";
            const event = new Event("sort", {
                bubbles: true
            });
            event.attribute = attribute;
            container.dispatchEvent(event)
        });
        ascButton.addEventListener("click", () => {
            addHiddenClass(ascButton);
            removeHiddenClass(descButton);
            container.sort = "desc";
            const event = new Event("sort", {
                bubbles: true
            });
            event.attribute = attribute;
            container.dispatchEvent(event)
        });
        return container
    }

    function insertTextAtPosition(text, textToAdd, selectionStart, selectionEnd) {
        return [text.slice(0, selectionStart), textToAdd, text.slice(selectionEnd)].join("")
    }

    function addDropTarget(parent, count, sortSpec, container, table, parentAttributes, entity, amount, offset, xpath, hiddenXpathValue, embedded, modal) {
        const dropTarget = addContainer(parent);
        addClass(dropTarget, "dropTarget");
        dropTarget.addEventListener("dragenter", event => {
            addClass(dropTarget, "dragOver");
            event.preventDefault()
        });
        dropTarget.addEventListener("dragover", event => {
            event.preventDefault()
        });
        dropTarget.addEventListener("dragleave", event => {
            removeClass(dropTarget, "dragOver");
            event.preventDefault()
        });
        dropTarget.addEventListener("drop", event => {
            const data = event.dataTransfer.getData("count");
            event.preventDefault();
            removeClass(dropTarget, "dragOver");
            if (data - count < -1 || data - count > 0) {
                sortSpec = reorderSorting(sortSpec, data, count);
                container.removeChild(table);
                addDataGrid(container, parentAttributes, entity, amount, offset, xpath, sortSpec, hiddenXpathValue, embedded, modal)
            }
        });
        return dropTarget
    }

    function reorderSorting(sortSpec, fromLocation, toLocation) {
        const itemToMove = sortSpec[fromLocation];
        sortSpec.splice(fromLocation, 1);
        sortSpec.splice(toLocation, 0, itemToMove);
        return sortSpec
    }

    function initModal(modal, topLeft = false) {
        if (modal.offsetHeight > mxExplorer.maxInitialHeight) {
            modal.style.height = mxExplorer.maxInitialHeight + "px"
        }
        if (modal.offsetWidth > mxExplorer.maxInitialWidth) {
            modal.style.width = mxExplorer.maxInitialWidth + "px"
        }
        if (topLeft) {
            modal.x = 0;
            modal.y = 0
        } else {
            modal.x = Math.floor((window.innerWidth - modal.offsetWidth) / 2);
            modal.y = Math.floor((window.innerHeight - modal.offsetHeight) / 2);
        }
        if (modal.contentCell.offsetHeight > mxExplorer.modalContentMaxInitialHeight) {
            setComponentHeightInPixels(modal.contentCell, mxExplorer.modalContentMaxInitialHeight)
        }
        if (modal.contentCell.offsetWidth > mxExplorer.modalContentMaxInitialWidth) {
            setComponentWidthInPixels(modal.contentCell, mxExplorer.modalContentMaxInitialWidth)
        }
        if (modal.dataGridContent != undefined && modal.dataGridContent.offsetWidth > mxExplorer.modalContentMaxInitialWidth) {
            setComponentWidthInPixels(modal.dataGridContent, mxExplorer.dataGridContentMaxInitialWidth)
        }
        if (modal.dataGridContent != undefined && modal.dataGridContent.offsetHeight > mxExplorer.modalContentMaxInitialHeight) {
            setComponentWidthInPixels(modal.dataGridContent, mxExplorer.dataGridContentMaxInitialHeight)
        }
        modal.newX = modal.x;
        modal.newY = modal.y;
        modal.style.top = modal.y + "px";
        modal.style.left = modal.x + "px"
    }

    function addCollapsiblePanel(parent, addHeaderContent, addContent) {
        const contentTable = addTable(parent);
        const headerRow = addRow(contentTable, false);
        headerRow.table = contentTable;
        const headerCell = addCell(headerRow);
        headerCell.row = headerRow;
        addHeaderContent(headerCell);
        headerCell.addEventListener("click", event => {
            event.stopPropagation();
            const target = headerCell;
            target.open = !target.open;
            if (target.open) {
                const contentRow = addRowAfter(target.row);
                const contentCell = addCell(contentRow);
                const contentContainer = addContentContainer(contentCell);
                target.contentRow = contentRow;
                addContent(contentContainer)
            } else {
                if (target.contentRow) {
                    contentTable.removeChild(target.contentRow)
                }
            }
        })
    }

    function matchSearchValue(value, searchValue, entityRow, resultArray) {
        if (value.toLowerCase().includes(searchValue, 0)) {
            removeHiddenClass(entityRow);
            resultArray[resultArray.length] = entityRow
        } else {
            addHiddenClass(entityRow)
        }
    }

    function searchEntities(searchValue) {
        const it = mxExplorer.entityRows.keys();
        let result = it.next();
        const resultArray = [];
        while (!result.done) {
            let value = result.value;
            let entityRow = mxExplorer.entityRows.get(value);
            const moduleSeparator = value.indexOf(".");
            if (moduleSeparator === -1) {
                matchSearchValue(value, searchValue, entityRow, resultArray)
            } else {
                matchSearchValue(value.substring(moduleSeparator + 1), searchValue, entityRow, resultArray)
            }
            result = it.next()
        }
        let entityCounter = 1;
        resultArray.forEach(entityRow => {
            if (entityCounter % 2 === 0) {
                addClass(entityRow, "evenRow")
            } else {
                removeClass(entityRow, "evenRow")
            }
            entityCounter++
        })
    }

    function addTextToInputField(inputField, text) {
        inputField.value = insertTextAtPosition(inputField.value, text, inputField.selectionStart, inputField.selectionEnd)
    }

    function splitArrayToString(array) {
        let string = "";
        let count = 1;
        array.forEach(item => {
            if (count !== 1) {
                string += ", "
            }
            string += item;
            count++
        });
        return string
    }

    function addMiniButton(parent, text) {
        const button = addButton(parent, text);
        addClass(button, "miniButton");
        return button
    }

    function exportColumn(xpath, attribute, sort) {
        mxDataGet(xpath, (entries, countObject) => {
            let exportString = attribute + "\n";
            entries.forEach(entry => {
                const value = entry.get(attribute);
                if (value) {
                    exportString += getValue(entry, attribute) + "\n"
                }
            });
            let textFile = null,
                makeTextFile = function(text) {
                    let data = new Blob([text], {
                        type: "text/plain"
                    });
                    if (textFile !== null) {
                        window.URL.revokeObjectURL(textFile)
                    }
                    textFile = window.URL.createObjectURL(data);
                    return textFile
                };
            let newWindow = open("about:blank", "View", "width=300,height=100");
            newWindow.focus();
            const link = addLink(newWindow.document.body, "View");
            link.href = makeTextFile(exportString)
        }, [attribute], getDefaultMxDataGetErrorHandler(), 0, null, sort)
    }

    function loadAssociations() {
        mxExplorer.entityKeys.forEach(entityKey => {
            const entity = mxExplorer.entities[entityKey];
            entity.getReferenceAttributes().forEach(reference => {
                let referenceNotFromSuper = true;
                entity.getSuperEntities().every(superEntity => {
                    if (mxExplorer.entities[superEntity] && mxExplorer.entities[superEntity].getReferenceAttributes().includes(reference)) {
                        referenceNotFromSuper = false;
                        return false
                    }
                    return true
                });
                if (referenceNotFromSuper) {
                    const associatedEntityKey = entity.getSelectorEntity(reference);
                    if (mxExplorer.associations.get(associatedEntityKey)) {
                        mxExplorer.associations.get(associatedEntityKey).set(reference, entityKey)
                    } else {
                        const associatedEntityMap = new Map;
                        mxExplorer.associations.set(associatedEntityKey, associatedEntityMap.set(reference, entityKey))
                    }
                    const associatedEntity = mxExplorer.entities[associatedEntityKey];
                    if (associatedEntity) {
                        if (associatedEntity.getSubEntities().length > 0) {
                            associatedEntity.getSubEntities().forEach(subEntityKey => {
                                if (mxExplorer.associations.get(subEntityKey)) {
                                    mxExplorer.associations.get(subEntityKey).set(reference, entityKey)
                                } else {
                                    const associatedEntityMap = new Map;
                                    mxExplorer.associations.set(subEntityKey, associatedEntityMap.set(reference, entityKey))
                                }
                            })
                        }
                    }
                }
            })
        })
    }

    function loadNPEntities() {
        // FIX: was mx.session.sessionData.metadata
        mx.session.getConfig().metadata.every(entity => {
            if (!entity.persistable) {
                mxExplorer.npEntityArray.push(entity.objectType)
            }
            return true
        });
        afterLoadNPEntities()
    }

    function addTabContainer(parent) {
        const tabContainer = addContainer(parent);
        addClass(tabContainer, "tabContainer")
    }

    function addTabToContainer(parent, name) {
        const button = addButton(parent, name);
        button.content = addContainer(parent);
        addClass(button.content, "tabcontent")
    }

    function addResizeContainer(parent, cursorType, setHeight, setWidth, modal, location) {
        const container = addContainer(parent);
        container.draggable = true;
        if (setHeight) {
            container.style.height = mxExplorer.resizeAreaSize + "px"
        }
        if (setWidth) {
            container.style.width = mxExplorer.resizeAreaSize + "px"
        }
        container.addEventListener("mouseover", () => {
            document.body.style.cursor = cursorType
        });
        container.addEventListener("mouseleave", () => {
            if (document.body.style.cursor === cursorType) {
                document.body.style.cursor = "default"
            }
        });
        container.addEventListener("dragstart", event => {
            container.dragStartX = event.x;
            container.dragStartY = event.y
        });
        container.addEventListener("dragend", event => {
            const widthDif = event.x - container.dragStartX;
            const heightDif = event.y - container.dragStartY;
            let withDifMod = null;
            let heightDifMod = null;
            if (location === "r") {
                withDifMod = widthDif;
                setModalNewWidth(modal, modal.offsetWidth + withDifMod)
            } else if (location === "l") {
                setNewX(modal, widthDif);
                withDifMod = widthDif * -1;
                setModalNewWidth(modal, modal.offsetWidth + withDifMod)
            } else if (location === "t") {
                setNewY(modal, heightDif);
                heightDifMod = heightDif * -1;
                setModalNewHeight(modal, modal.offsetHeight + heightDifMod)
            } else if (location === "b") {
                heightDifMod = heightDif;
                setModalNewHeight(modal, modal.offsetHeight + heightDifMod)
            } else if (location === "tr") {
                withDifMod = widthDif;
                setModalNewWidth(modal, modal.offsetWidth + widthDifMod);
                setNewY(modal, heightDif);
                heightDifMod = heightDif * -1;
                setModalNewHeight(modal, modal.offsetHeight + heightDifMod)
            } else if (location === "br") {
                withDifMod = widthDif;
                setModalNewWidth(modal, modal.offsetWidth + widthDifMod);
                heightDifMod = heightDif;
                setModalNewHeight(modal, modal.offsetHeight + heightDifMod)
            } else if (location === "tl") {
                withDifMod = widthDif;
                setNewX(modal, widthDif);
                withDifMod = widthDif * -1;
                setModalNewWidth(modal, modal.offsetWidth + widthDifMod);
                setNewY(modal, heightDif);
                heightDifMod = heightDif * -1;
                setModalNewHeight(modal, modal.offsetHeight + heightDifMod)
            } else if (location === "bl") {
                setNewX(modal, widthDif);
                withDifMod = widthDif * -1;
                setModalNewWidth(modal, modal.offsetWidth + widthDifMod);
                heightDifMod = heightDif;
                setModalNewHeight(modal, modal.offsetHeight + heightDifMod)
            }
            if (modal.dataGridContent != undefined) {
                if (withDifMod != null) {
                    modal.dataGridContent.style.width = modal.dataGridContent.offsetWidth + withDifMod;
                    modal.dataGridContent.dataTable.style.maxWidth = null
                }
                if (heightDifMod != null) {
                    modal.dataGridContent.style.height = modal.dataGridContent.offsetHeight + heightDifMod;
                    modal.dataGridContent.dataTable.style.maxHeight = null
                }
            }
        });
        return container
    }

    function setModalNewWidth(modal, newWidth) {
        const minWidth = 100;
        setComponentWidthInPixels(modal, newWidth > minWidth ? newWidth : minWidth);
        setComponentWidthInPixels(modal.contentCell, calculateModalContentWidth(modal.offsetWidth));
        if (modal.dataGridContent != undefined) {
            setComponentWidthInPixels(modal.dataGridContent, calculateDataGridContentWidth(modal.contentCell.offsetWidth))
        }
    }

    function setModalNewHeight(modal, newHeight) {
        const minHeight = 100;
        setComponentHeightInPixels(modal, newHeight > minHeight ? newHeight : minHeight);
        setComponentHeightInPixels(modal.contentCell, calculateModalContentHeight(modal.offsetHeight));
        if (modal.dataGridContent != undefined) {
            setComponentHeightInPixels(modal.dataGridContent, calculateDataGridContentHeight(modal.contentCell.offsetHeight, modal))
        }
    }

    function setNewX(modal, widthDif) {
        modal.newX = modal.x + widthDif;
        modal.x = modal.newX;
        modal.style.left = modal.newX + "px"
    }

    function setNewY(modal, heightDif) {
        modal.newY = modal.y + heightDif;
        modal.y = modal.newY;
        modal.style.top = modal.newY + "px"
    }

    function addResizeCenterSidesStyling(element) {
        element.style.width = mxExplorer.resizeAreaSize + "px";
        setComponentHeightInPixels(element, "calc(100% - " + 2 * mxExplorer.resizeAreaSize);
        element.style.position = "absolute";
        element.style.top = mxExplorer.resizeAreaSize + "px"
    }

    function setComponentHeightInPixels(component, newHeight) {
        component.style.height = newHeight + "px"
    }

    function setComponentWidthInPixels(component, newWidth) {
        component.style.width = newWidth + "px"
    }

    function calculateModalContentWidth(modalWidth) {
        return modalWidth - (2 * mxExplorer.resizeAreaSize + 2 * mxExplorer.modalBorderWidth)
    }

    function calculateModalContentHeight(modalHeight) {
        return modalHeight - (mxExplorer.navPanelHeight + 2 * mxExplorer.resizeAreaSize + 2 * mxExplorer.modalBorderWidth)
    }

    function calculateDataGridContentWidth(modalContentWidth) {
        return modalContentWidth - (mxExplorer.modalContentPaddingLeft + mxExplorer.modalContentPaddingRight + mxExplorer.modalContentCellPaddingLeft + mxExplorer.modalContentCellPaddingRight)
    }

    function calculateDataGridContentHeight(modalContentHeight, modal) {
        let otherContent = 0;
        if (modal != undefined) {
            if (modal.topRow != undefined) {
                otherContent += modal.topRow
            }
            if (modal.sortingRow != undefined) {
                otherContent += modal.sortingRow
            }
            if (modal.navigationRow != undefined) {
                otherContent += modal.navigationRow
            }
        }
        return modalContentHeight - (mxExplorer.modalContentPaddingTop + mxExplorer.modalContentPaddingBottom + mxExplorer.modalContentCellPaddingTop + mxExplorer.modalContentCellPaddingBottom + mxExplorer.modalContentCellPaddingLeft + mxExplorer.modalContentCellPaddingRight + otherContent)
    }
})();