import { Component, createResource, createSignal, For, Show } from 'solid-js';
import { read, utils, writeFileXLSX } from 'xlsx';

type President = {
  Name: string;
  Index: number;
};

const loadSheet = async (file: string) => {
  const raw = await (await fetch('https://sheetjs.com/pres.numbers')).arrayBuffer();
  const workbook = read(raw, { cellFormula: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = utils.sheet_to_json<President>(sheet);
  const headers = Object.keys(rows[0]);
  return { headers, rows };
};

const App: Component = () => {
  const [filename, setFilename] = createSignal('DataTypesFormats.xlsx');
  const [sheetData, { mutate }] = createResource(filename, loadSheet);

  const exportData = () => {
    if (!['ready', 'refreshing'].includes(sheetData.state)) return;
    const data = sheetData();
    if (!data) return;
    const sheet = utils.json_to_sheet(data.rows);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, sheet, 'Sheet1');
    writeFileXLSX(workbook, 'president.xlsx');
  };

  const updateValue = (rowIdx: number, key: keyof President, val: President[keyof President], { currentTarget }: Event & { currentTarget: HTMLInputElement }) => {
    const data = sheetData();
    if (!data) return;
    const president = data.rows[rowIdx];
    (president[key] as string | number) = val.constructor(currentTarget.value) as string | number;
    mutate(data);
  };

  return (
    <>
      <Show when={sheetData()} fallback={<div>Loading...</div>}>
        <table>
          <thead>
            <For each={sheetData()?.headers}>{(key) => <th>{key}</th>}</For>
          </thead>
          <tbody>
            <For each={sheetData()?.rows}>
              {(row, rowIdx) => (
                <tr>
                  <For each={Object.entries(row) as [keyof President, President[keyof President]][]}>
                    {([key, val]) => (
                      <td>
                        <input type={typeof val === 'string' ? 'text' : typeof val} value={String(val)} onChange={updateValue.bind(this, rowIdx(), key, val)}></input>
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>
      <button type='button' onClick={exportData}>
        Save File
      </button>
    </>
  );
};

export default App;
