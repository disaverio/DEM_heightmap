# Heightmap

Tool for creation of 3D map of terrain from raster [DEM](https://en.wikipedia.org/wiki/Digital_elevation_model) files. Implementation adopts [three.js](https://threejs.org/), a 3D javascript library.

It supports all raster **DEM files** format (.hgt, .bil, etc..) and all resolutions (3 arc seconds, 1 arc seconds, or more) with big/little endianness where each file describes a LATxLON sector.

Tool decorates the map with Google®'s texture at various resolutions (zoom).

## Example

[Matterhorn](https://en.wikipedia.org/wiki/Matterhorn) map with two different textures:

Sat texture, from Nort-West:

![Sat](img/matterhorn_sat.jpg)

Terrain texture, from South-East:

![Terrain](img/matterhorn_terrain.jpg)

## Use

Configure `params.js` file with your Google® API key, correct references to DEM files' folder and right filename format (with other file's properties):

```js
return {
    google: {
        API_KEY: ''
    },
    dem: {
        bil: {
            format: ".bil",
            folder: "dem_files/bil/",
            filename: "{{NS}}{{LAT}}_{{WE}}{{LON}}_1arc_v3",
            endianness: "little",
            uppercaseName: false,
            overlap: false
        },
        hgt: {
            format: ".hgt",
            folder: "dem_files/hgt/",
            filename: "{{NS}}{{LAT}}{{WE}}{{LON}}",
            endianness: "big",
            uppercaseName: true,
            overlap: false
        }
    }
};
```

Then create an instance of App, and invoke .render() method:

```js
define(['App', 'params'], function (App, params) {
    requirejs(['domReady!'], function (document) {
        var app = new App(document, params.google.API_KEY, 'hgt');
        app.render(45.976581, 7.658447); // Matterhorn coordinates
    });
});
```

### Params

#### App()
```js
var app = new App(document, GOOGLE_API_KEY, selected_dem_format)
```

where `selected_dem_format` is a string with dem to use, configured in `params.js`.

#### .render(LAT, LON[, params])
`LAT`, `LON`: Numbers, center coordinates.

`params` is an object with properties:

- `zoom`: Integer, value `11` to `20`, defines area dimension, like in Google® map. Default: `12`.

- `detailsLevel`: Integer, value `0` to `4`, defines details of Google® textures. Default: `0`.

- `size`: Integer, defines size in px of single texture. Max value 640, from Google®. Default: `512`.

- `scaleFactor`: Number, defines rescalation of elevations. Default: `1`.

- `withAnimation`: Boolean, if true map elevation is animated. Default: `false`.

- `mapType`: String, `'terrain'`, `'satellite'`, `'roadmap'`, `'hybrid'` from Google®. Default: `'satellite'`.

### Other

Tool uses [async](https://github.com/disaverio/async) as lightweight [Q](https://github.com/kriskowal/q) replacement for async calls management.