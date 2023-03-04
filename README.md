# Keywall Rewind

A lightweight node server library with request and error logging

<br />
<div style="display:flex;justify-content:center;">
    <img src="https://github.com/LowLifeArcade/keywall/blob/main/keywall-logo.png?raw=true" alt="drawing" width="300"/>
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
$ npm install express
```

### Configuration

Pass a config object on creation

```js
const app = rewind({
    base: '/keywall'
})
```

Default:
```js
{ 
    base = '/', 
    loggingEnabled = true,
    logsPath = null,
    logTTL = null,
}
```
