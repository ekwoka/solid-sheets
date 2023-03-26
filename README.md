[SolidJS](https://www.solidjs.com/) is a JS library for building user interfaces.

This demo covers the basics of handling the loading and display of sheet data. Some SolidJS familiarity is assumed.

## Installation

[The "Frameworks" section](https://docs.sheetjs.com/docs/getting-started/installation/frameworks) covers installation with PNPM and other package managers.

The library can be imported directly from JS or JSX code with:

```ts
import { read, utils, writeFile } from 'xlsx';
``` 

## Data Loading

The first step to giving the user a spreadsheet is to get the data! In SolidJS, the best way to do this is with [createResource](https://www.solidjs.com/docs/latest#createresource). We can abstract a fetching function and pass it to `createResource` as shown below. We will start basic and expand to more advanced concepts later.

```tsx
import { read, utils } from 'xlsx';
import { createResource, Component } from 'solid-js'
  
type President = {  
  Name: string;  
  Index: number;  
}

const loadSheetFromURL = (url: string) => {
  const raw = await (await fetch(url)).arrayBuffer(); // gets file stream as an arrayBuffer
  const workbook = read(raw); // processes XLSX buffer to a JS object
  const sheet = workbook.Sheets[workbook.SheetNames[0]]; // gets first sheet of workbook

  // to get an Array of Keys Objects
  // const data = utils.sheet_to_json<President>(sheet);

  // to get html table
  // const data = utils.sheet_to_html(sheet)

  return sheet;
}


const App: Component = () => {
	const [sheetData] = createResource('https://sheetjs.com/pres.numbers', loadSheetFromURL)

	return <div>JSON.stringify(data())</div>
}
```

`sheetData` here will resolve after fetching/processing as 

```json
{
    "!ref": "A1:B6",
    "A1": {
        "t": "s",
        "v": "Name",
        "w": "Name"
    },
    "B1": {
        "t": "s",
        "v": "Index",
        "w": "Index"
    },
    "A2": {
        "t": "s",
        "v": "Bill Clinton"
    },
    // ...
    "A6": {
        "t": "s",
        "v": "Joseph Biden"
    },
    "B6": {
        "t": "n",
        "v": 46
    }
}
```

These are the [raw cell objects](https://docs.sheetjs.com/docs/csf/cell) SheetJS works with. It contains a lot of useful information for the different parsers, but is rarely going to be the best way for you to work with the data but is important to know if you need to ASSUME DIRECT CONTROL.

## Rendering Sheet

Of course, loading the sheet data is the easy part, displaying and interacting with the data is can be a bit more complicated, especially depending on what kind of experiences you want to provide.

### as HTML

This method is the simplest, and also pretty much entirely framework agnostic. This is great for quick and simple experiences.

We just need to, in our data fetcher use

```ts
const loadSheetFromURL = (url: string) => {
  //...other code from before
  
  // to get html table
  const data = utils.sheet_to_html(sheet)

  return data;
}
```

and our component to

```tsx
import { Show } from 'solid-js'

const App: Component = () => {
	const [sheetTable] = createResource('https://sheetjs.com/pres.numbers', loadSheetFromURL)

	return (
		<Show when={['resolved', 'refreshing'].includes(data.state())}
			fallback={<div>Loading</div>}>
			<div innerHTML={sheetTable()}></div>
		</Show>
	)
}
```


![[president_table.png]] ![[president_html.png]]

Just add some CSS and it's good to go.

#### Editing Data

Of course, just viewing data isn't the limit here.

Making the HTML editable and then saving/uploading a newly generated XLSX is actually quite simple. We change one line in our `loadSheetFromURL` function:

```ts
  const data = utils.sheet_to_html(sheet, { editable: true })

  return data
```

This will make all of the cells be editable inline.

To now get this data back as a sheet or workbook to save, we can add the following to our Component body

```tsx
  let container: HTMLDivElement;

  const exportData = () => {
    const table = container.querySelector('table'); // get table element from container
    if (!table) return;
    const wb = utils.table_to_book(table); // process table elements into workbook
    writeFileXLSX(wb, 'presidents.xlsx'); // save file locally
  };

  return (<>
    <Show when={['ready', 'refreshing'].includes(data.state)} fallback={<div>Loading</div>}>
      <div innerHTML={data()} ref={container}></div>
    </Show>
    <button type="button" onClick={exportData}>Save File</button>
  </>);
```

Unfortunately, we can't directly reference the underlying `table` element, but getting the table from inside the container `div` is quite simple.

> Note: 
> When making a table editable, the cells will lose any references to the original data types, but SheetJS will attempt to identify the correct data types from the cell contents when creating the sheet data. 
> 
> Additionally formulae do not work, both updating when the dependencies change and adding new formulae (they will be treated as their text value).

### From Array of Objects

When more control over how and what is rendered, [Array of Objects](https://docs.sheetjs.com/docs/api/utilities#array-output) (aoo) is often the preferred strategy. This, by default, assumes the first row contains your table headings, and every row contains data that is shapped to those heading. using `utils.sheet_to_json` we can get an array of objects keyed to the headings in the table.

This essentially allows the spreadsheet file to act like the table of a DB, just providing a huge dump of data for you to do with as you please (filtering, searching, bulk editing, etc). We won't get into all those details here, but we can run over the basics of taking this data and rendering it to our page with JSX.

> Note:
> With the increased control that this gives you over how to render the data, you will also lose some information about how the data is laid out in the original sheet. For example, merged cells are not preserved. Data is simply mapped to keys for you to do with as you please

We just make small changes to our loader:

```tsx
const loadSheetFromURL = (url: string) => {
  const raw = await (await fetch(url)).arrayBuffer(); // gets file stream as an arrayBuffer
  const workbook = read(raw); // processes XLSX buffer to a JS object
  const sheet = workbook.Sheets[workbook.SheetNames[0]]; // gets first sheet of workbook

  // to get an Array of Keys Objects
  const rows = utils.sheet_to_json<President>(sheet); // returns typed array
  const headers = Object.keys(data[0]) // gets array of header values
  
  return { headers, rows };
}
```

Here we return the headers and rows separately, for convenience to how we will render it later, but you may not want to do it that way for your use case.

Next we use the `Show` and `For` components to render out the table how we want:

```tsx
import { For, Show } from 'solid-js';

const App: Component = () => {
  const [sheetData] = createResource(filename, loadSheet);


  return (
  <Show when={sheetData()} fallback={<div>Loading...</div>}>
	<table>
	  <thead>
		<For each={sheetData()?.headers}>{(key) => <th>{key}</th>}</For>
	  </thead>
	  <tbody>
		<For each={sheetData()?.rows}>
		  {(row) => (
			<tr>
			  <For each={Object.values(row)}>
				{(val) => (
				  <td>
					{val}
				  </td>
				)}
			  </For>
			</tr>
		  )}
		</For>
	  </tbody>
	</table>
  </Show>
  );
};

```

This is not unlike the result we had before, but now we can add our own styling with ease (ie. TailwindCSS), simply filter the data, adjust the formatting of different value types, or add other kinds of interactivity where we see fit.

#### Editing Data

Like before we might want to provide options for editing the data, and now we have quite a few more options that we did not have before, namely, we can do data validation and control type coercion on our own.

Here we can define a handler function

```ts
const [sheetData, { mutate }] = createResource(filename, loadSheet);

const updateValue = (rowIdx: number, key: keyof President, val: President[keyof President], { currentTarget }: Event & { currentTarget: HTMLInputElement }) => {
  const data = sheetData();
  if (!data) return;
  // use original values constructor to coerce inputs value;
  data.rows[rowIdx][key] = val.constructor(currentTarget.value) 
  mutate(data); // updates resource signal
};
```

A bit of wackiness here, but it's simple enough to illustrate the functionality. Solid allows us to update the resource signal directly with the `mutate` method. Here we can actually just update the resource in place and then run mutate with the updated value. `mutate` does not check for referential equality like the normal `setSignal` default behavior. 

Here we just use the same constructor of the original value to coerce the inputs value into the same type. This works great for maintaining the the most common data types (`String`,  `Number`, and `Date`).

You could also implement your own strict data validation and handle errors here.

Next updating the JSX is quite simple.

```tsx
<For each={sheetData()?.rows}>
  {(row, rowIdx) => (
	<tr>
	  <For each={Object.entries(row) as [keyof President, President[keyof President]][]}>
		{([key, val]) => (
		  <td>
			<input type={typeof val === 'string' ? 'text' : typeof val} 
				value={val}
				onChange={updateValue.bind(this, rowIdx(), key, val)}
			></input>
		  </td>
		)}
	  </For>
	</tr>
  )}
</For>
```

We just toss an `input` into the cell, set the correct input `type` and hook up a listener. You could also choose to be more selective about which cells are even editable here.

Saving the data to file is also quite simple

```ts
const exportData = () => {
  if (!['ready', 'refreshing'].includes(sheetData.state)) return;
  const data = sheetData();
  if (!data) return;
  const sheet = utils.json_to_sheet(data.rows);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, sheet, 'Sheet1');
  writeFileXLSX(workbook, 'president.xlsx');
};
```

> Note:
> Formulae are only provided as the raw output value, not the equation itself. Similarly, any formulae typed into the input will not be evaluated, and will simply be a raw string.