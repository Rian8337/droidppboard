/* eslint-disable @typescript-eslint/no-var-requires */
const prod = process.env.NODE_ENV === "production";

const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCSSExtractPlugin = require("mini-css-extract-plugin");
const path = require("path");

module.exports = {
    mode: prod ? "production" : "development",
    entry: "./src/index.tsx",
    output: {
        path: path.join(process.cwd(), "build"),
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/i,
                exclude: /node_modules/,
                resolve: {
                    extensions: [".ts", ".tsx", ".js", ".json"],
                },
                use: "ts-loader",
            },
            {
                test: /\.css$/i,
                use: [MiniCSSExtractPlugin.loader, "css-loader"],
            },
            {
                test: /\.(png|jpg|gif)$/i,
                use: "url-loader",
            },
        ],
    },
    devtool: prod ? undefined : "source-map",
    plugins: [
        new HtmlWebpackPlugin({
            template: "public/index.html",
        }),
        new MiniCSSExtractPlugin(),
    ],
};
