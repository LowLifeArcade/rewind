# Keywall Rewind

A lightweight node server library

<br />
<div style="display:flex;justify-content:center;">
    <img src="https://github.com/LowLifeArcade/keywall/blob/main/keywall-logo.png?raw=true" alt="drawing" width="300"/>
</div>
<br />

## Directions

> `npm i keywall-rewind`

```js
    const app = rewind();
    app.get('/', async (req, res) => {
        res.send('keywall rewind')
    })
    app.listen(1337, () => console.log('server running on 1337'))
    
    const router = useRouter();
    router.setBase('/keywall');
    router.get('/', async (req, res) => {
        res.send('keywall rewind router')
    })
```
