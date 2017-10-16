requirejs.config({
    baseUrl: ".",
    paths: {
        domReady:           'bower_components/domReady/domReady',
        threejs:            'bower_components/three.js/build/three.min',
        async:              'src/lib/async-master/src/async',
        GoogleCoords:       'src/GoogleCoords',
        utils:              'src/utils',
        params:             'src/params',
        Dem:                'src/Dem',
        GoogleTexture:      'src/GoogleTexture',
        Texture:            'src/Texture',
        App:                'src/App',
        OrbitControls:      'bower_components/three.js/examples/js/controls/OrbitControls',
        threejsExport:      'src/threejs-export'
    },
    shim: {
        OrbitControls: ['threejsExport']
    },
    deps: ['src/start']
});