# Keywall Rewind

A lightweight node server library with request and error logging

<br />
<div style="display:flex;justify-content:center;">
    <img src="https://github.com/LowLifeArcade/keywall/blob/main/keywall-logo.png?raw=true" alt="drawing" width="300"/>
</div>
<br />

## Directions

> `npm i @lowlifearcade/rewind`

#### Example:

```js
    import rewind from 'rewind';

    const app = rewind();
    app.get('/', async (req, res) => {
        res.send('keywall rewind');
    });
    app.listen(1337, () => {
        console.log('server running on 1337');
    });
```
