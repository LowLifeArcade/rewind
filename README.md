# Rewind

A lightweight node server library with request and error logging out of the box.

<br />
<div style="display:flex;justify-content:center;">
    <img src="rewind-logo.png" alt="drawing" width="300"/>
</div>
<br />

```js
    import rewind from 'rewind'; // "type": "module" in package.json

    const app = rewind();
    
    app.get('/', async (req, res) => {
        res.send('Keywall Rewind');
    });
    app.listen(1337, () => {
        console.log('server running on 1337');
    });
```

## Installation

```console
$ npm i @lowlifearcade/rewind
```

### Configuration

Pass a config object on creation

```js
const app = rewind({
    base: '/rewind'
})
```

Default:
```js
{ 
    base = '/', 
    loggingEnabled = true,
    logsPath = null, // creates a "logs" folder in the root of your project
    logTTL = null, // they live forever
}
```
