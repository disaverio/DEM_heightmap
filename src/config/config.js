requirejs.config({
    baseUrl: ".",
    paths: {
        domReady:           'bower_components/domReady/domReady',
        threejs:            'bower_components/threejs-dist/three.min',
        async:              'src/lib/async-master/src/async',
        GoogleCoords:       'src/GoogleCoords',
        utils:              'src/utils',
        params:             'src/params',
        Dem:                'src/Dem',
        GoogleTexture:      'src/GoogleTexture',
        App:                'src/App',
        OrbitControls:      'src/OrbitControls'
    },
    deps: ['src/start']
});