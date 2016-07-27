/*
 Copyright 2016 Autodesk,Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
import React, { Component, PropTypes } from 'react';

import { block as blockDragType } from '../../constants/DragTypes';
import { chain } from 'lodash';

import { registry } from '../../inventory/registry';

import Spinner from '../../components/ui/Spinner';
import InventoryTabs from './InventoryTabs';
import InventoryList from './InventoryList';
import InventoryListGroup from './InventoryListGroup';
import InventorySearchResultsBySource from './InventorySearchResultsBySource';
import InventorySearchResultsByKind from './InventorySearchResultsByKind';

const inventoryTabs = [
  { key: 'source', name: 'By Source' },
  { key: 'type', name: 'By Kind' },
];

export default class InventorySearchResults extends Component {
  static propTypes = {
    searchTerm: PropTypes.string.isRequired,
    sourcesToggling: PropTypes.bool.isRequired,
    searching: PropTypes.bool.isRequired,
    sourceList: PropTypes.array.isRequired,
    searchResults: PropTypes.object.isRequired,
    sourcesVisible: PropTypes.object.isRequired,
    inventoryToggleSourceVisible: PropTypes.func.isRequired,
    blockStash: PropTypes.func.isRequired,
  };

  state = {
    groupBy: 'source',
  };

  getFullItem = (registryKey, item, onlyConstruct = false, shouldAddToStore = true) => {
    const { source, id } = item.source;
    const parameters = {
      onlyConstruct,
    };

    if (source && id) {
      return registry[source].get(id, parameters, item)
        .then(result => {
          //if we have an array, first one is construct, and all other blocks should be added to the store
          if (Array.isArray(result)) {
            const [ construct, ...blocks ] = result;

            //need to specially handle blocks which are constructs here, add them to the store (not important for showing in the inspector)
            //todo - performance -- this will effectively add everything twice, since will be cloned. Should not clone deep (there is an option for this in blockClone, need to pass to onDrop of construct viewer, somehow diffrentiate from dragging a construct from a project
            if (shouldAddToStore) {
              this.props.blockStash(construct, ...blocks);
            }

            return construct;
          }
          //otherwise, just one result
          return result;
        });
    }
    return Promise.resolve(item);
  };

  handleTabSelect = (key) => {
    this.setState({ groupBy: key });
  };

  handleListGroupToggle = (source) => {
    this.props.inventoryToggleSourceVisible(source);
  };

  handleItemOnSelect = (registryKey, item) => {
    return this.getFullItem(registryKey, item, true, false);
  };

  handleItemOnDrop = (registryKey, item, target, position) => {
    return this.getFullItem(registryKey, item, false, true);
  };

  render() {
    const { searchTerm, sourcesToggling, searching, sourceList, searchResults, sourcesVisible } = this.props;
    const { groupBy } = this.state;

    if (!searchTerm) {
      return null;
    }

    const noSearchResults = Object.keys(searchResults).reduce((acc, key) => acc + searchResults[key].length, 0) === 0;

    if (searching && noSearchResults) {
      return (<Spinner />);
    }

    const groupsContent = noSearchResults
      ?
      (<div className="InventoryGroup-placeholderContent">No Results Found</div>)
      :
      (groupBy === 'source')
        ?
        <InventorySearchResultsBySource searchResults={searchResults}
                                        sourcesVisible={sourcesVisible}
                                        onListGroupToggle={(key) => this.handleListGroupToggle(key)}
                                        onItemDrop={(key, item) => this.handleItemOnDrop(key, item)}
                                        onItemSelect={(key, item) => this.handleItemOnSelect(key, item)}
        />
        :
        <InventorySearchResultsByKind searchResults={searchResults}
                                      sourcesVisible={sourcesVisible}
                                      onListGroupToggle={(key) => this.handleListGroupToggle(key)}
                                      onItemDrop={(key, item) => this.handleItemOnDrop(key, item)}
                                      onItemSelect={(key, item) => this.handleItemOnSelect(key, item)}
        />;

    const showTabs = !(!searchTerm || sourcesToggling || (searching && noSearchResults) || noSearchResults);

    return (
      <div className="InventoryGroup-contentNester InventorySearchResults">
        {showTabs && (
          <InventoryTabs tabs={inventoryTabs}
                         activeTabKey={groupBy}
                         onTabSelect={(tab) => this.handleTabSelect(tab.key)}/>
        )}

        {!sourcesToggling && (
          <div className="InventoryGroup-contentInner no-vertical-scroll">
            {groupsContent}
          </div>
        )}
      </div>
    );
  }
}
