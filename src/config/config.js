requirejs.config({
    baseUrl: ".",
    paths: {
        domReady:           'bower_components/domReady/domReady',
        threejs:            'src/lib/threejs/three.min',
        async:              'src/lib/async-master/src/async',
        GoogleCoords:       'src/GoogleCoords',
        utils:              'src/utils',
        params:             'src/params',
        Dem:                'src/Dem',
        GoogleTexture:      'src/GoogleTexture',
        Texture:            'src/Texture',
        App:                'src/App',
        OrbitControls:      'src/lib/threejs/OrbitControls'
    },
    deps: ['src/start']
});