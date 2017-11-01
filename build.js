({
    appDir: './',
    baseUrl: '.',
    dir: './dist',
    modules: [{
        name: 'DemHeightmap'
    }],
    fileExclusionRegExp: /(^((bower\.json)|(compile\.sh)|(README\.md)|(package-lock\.json)|(package\.json)|(LICENSE)|(build\.js)|(dem_files)|(example)|(img)|(node_modules))$)|(^\.)/,
    removeCombined: true,
    paths: {
        threejs:            'bower_components/three.js/build/three.min',
        async:              'src/lib/async-master/src/async',
        GoogleCoords:       'src/GoogleCoords',
        utils:              'src/utils',
        Dem:                'src/Dem',
        GoogleTexture:      'src/GoogleTexture',
        Texture:            'src/Texture',
        DemHeightmap:       'src/DemHeightmap',
        OrbitControls:      'src/lib/OrbitControls'
    }
})