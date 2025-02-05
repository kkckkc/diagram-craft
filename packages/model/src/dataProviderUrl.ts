import {
  Data,
  DataProviderEventMap,
  DataProviderQuery,
  RefreshableDataProvider,
  RefreshableSchemaProvider
} from './dataProvider';
import { DataSchema } from './diagramDataSchemas';
import { EventEmitter } from '@diagram-craft/utils/event';
import { assert } from '@diagram-craft/utils/assert';

type DataWithSchema = Data & { _schemaId: string };

export const UrlDataProviderId = 'urlDataProvider';

export class UrlDataProvider
  extends EventEmitter<DataProviderEventMap>
  implements RefreshableDataProvider, RefreshableSchemaProvider
{
  id = UrlDataProviderId;

  schemas: DataSchema[];

  private data: DataWithSchema[] = [];

  dataUrl: string | undefined = undefined;
  schemaUrl: string | undefined = undefined;

  constructor(s?: string) {
    super();

    if (s) {
      const d = JSON.parse(s);
      this.schemas = d.schemas;
      this.data = d.data;
      this.schemaUrl = d.schemaUrl;
      this.dataUrl = d.dataUrl;

      this.refreshSchemas(false).then(() => {
        this.refreshData(false);
      });
    } else {
      this.data = [];
      this.schemas = [];
    }
  }

  getById(ids: Array<string>): Data[] {
    return this.data.filter(data => ids.includes(data._uid));
  }

  getData(schema: DataSchema): Array<Data> {
    return this.data.filter(data => data._schemaId === schema.id);
  }

  queryData(schema: DataSchema, query: string): Array<Data> {
    const q = new DataProviderQuery(query);
    return this.data.filter(data => data._schemaId === schema.id && q.matches(data));
  }

  async refreshData(force = true): Promise<void> {
    const oldDataMap = new Map();
    this.data.forEach(d => oldDataMap.set(d._uid, d));

    const newData = await this.fetchData(force);

    const newDataIds = new Set();
    this.data.forEach(d => newDataIds.add(d._uid));

    this.data = [];
    for (const d of newData) {
      this.data.push(d);

      const oldEntry = oldDataMap.get(d._uid);
      if (oldEntry) {
        this.emit('update', d);
      } else {
        this.emit('add', d);
      }
    }

    for (const [oldId, oldEntry] of oldDataMap.entries()) {
      if (!newDataIds.has(oldId)) {
        this.emit('delete', oldEntry);
      }
    }
  }

  async refreshSchemas(force = true): Promise<void> {
    this.schemas = await this.fetchSchemas(force);
  }

  serialize(): string {
    return JSON.stringify({
      schema: this.schemas,
      data: this.data,
      dataUrl: this.dataUrl,
      schemaUrl: this.schemaUrl
    });
  }

  private async fetchData(force = true): Promise<DataWithSchema[]> {
    assert.present(this.dataUrl);
    const res = await fetch(this.dataUrl, {
      cache: force ? 'no-cache' : 'default'
    });
    return res.json();
  }

  private async fetchSchemas(force = true): Promise<DataSchema[]> {
    assert.present(this.schemaUrl);
    const res = await fetch(this.schemaUrl, {
      cache: force ? 'no-cache' : 'default'
    });
    return res.json();
  }
}
