const path = require('path');

module.exports = [
    // Frontend bundle
    {
        entry: {
            app: ['./src/index.ts'],
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: 'ts-loader',
                    exclude: /node_modules/
                }
            ]
        },
        resolve: {
            alias: {
                '@shared': path.resolve(__dirname, './shared')
            },
            extensions: ['.ts', '.js']
        },
        devtool: "source-map",
        output: {
            filename: '[name].bundle.js',
            path: path.resolve(__dirname, 'dist')
        },
        optimization: {
            splitChunks: {
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendor',
                        chunks: 'all'
                    }
                }
            }
        },
        cache: {
            type: 'filesystem',
            buildDependencies: {
                config: [__filename]
            }
        }
    }
];