#include <napi.h>
#include <algorithm>
#include "msdfgen.h"
#include "shape_parser.h"

static Napi::Value GenerateMSDF(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // Validate arguments: generateMSDF(shape, options)
    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Expected 2 arguments: (shape, options)")
            .ThrowAsJavaScriptException();
        return env.Null();
    }
    if (!info[0].IsObject()) {
        Napi::TypeError::New(env, "First argument (shape) must be an object")
            .ThrowAsJavaScriptException();
        return env.Null();
    }
    if (!info[1].IsObject()) {
        Napi::TypeError::New(env, "Second argument (options) must be an object")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    // Parse the Shape from JS object
    msdfgen::Shape shape;
    if (!msdfgen_napi::ParseShape(env, info[0].As<Napi::Object>(), shape)) {
        return env.Null(); // ParseShape already threw a JS exception
    }

    // Parse options
    Napi::Object opts = info[1].As<Napi::Object>();

    if (!opts.Has("scale") || !opts.Has("range") || !opts.Has("translate") ||
        !opts.Has("width") || !opts.Has("height")) {
        Napi::TypeError::New(env, "Options must have: scale, range, translate, width, height")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    double scale = opts.Get("scale").As<Napi::Number>().DoubleValue();
    double range = opts.Get("range").As<Napi::Number>().DoubleValue();
    int width = opts.Get("width").As<Napi::Number>().Int32Value();
    int height = opts.Get("height").As<Napi::Number>().Int32Value();

    if (width <= 0 || height <= 0) {
        Napi::RangeError::New(env, "Width and height must be positive integers")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Object translate = opts.Get("translate").As<Napi::Object>();
    double translateX = translate.Get("x").As<Napi::Number>().DoubleValue();
    double translateY = translate.Get("y").As<Napi::Number>().DoubleValue();

    // Normalize shape geometry for distance field generation
    shape.normalize();

    // Orient contours to conform to the non-zero winding rule
    // This ensures correct inside/outside determination regardless of input winding
    shape.orientContours();

    // Assign edge colors (required before generateMSDF)
    // 3.0 radians (~172 degrees) is the standard angle threshold for corner detection
    msdfgen::edgeColoringSimple(shape, 3.0, 0);

    // Allocate output bitmap (3 channels: R, G, B for MSDF)
    msdfgen::Bitmap<float, 3> msdf(width, height);

    // Generate the MSDF
    // All parameters are in shape coordinate units:
    //   range: SDF distance range in shape units
    //   scale: pixels per shape unit
    //   translate: shape-space offset applied before scaling
    //              pixel = (shapeCoord + translate) * scale
    msdfgen::Vector2 scaleVec(scale, scale);
    msdfgen::Vector2 translateVec(translateX, translateY);
    msdfgen::generateMSDF(msdf, shape, range, scaleVec, translateVec);

    // Convert float [0,1] bitmap to uint8 [0,255] RGB buffer
    // Uses msdfgen's pixelFloatToByte convention: byte(clamp(256*x, 255))
    size_t bufferSize = static_cast<size_t>(width) * static_cast<size_t>(height) * 3;
    Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::New(env, bufferSize);
    uint8_t* data = buffer.Data();

    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            const float* pixel = msdf(x, y);
            size_t idx = (static_cast<size_t>(y) * static_cast<size_t>(width) + static_cast<size_t>(x)) * 3;
            data[idx + 0] = static_cast<uint8_t>(std::min(255.0f, std::max(0.0f, 256.0f * pixel[0])));
            data[idx + 1] = static_cast<uint8_t>(std::min(255.0f, std::max(0.0f, 256.0f * pixel[1])));
            data[idx + 2] = static_cast<uint8_t>(std::min(255.0f, std::max(0.0f, 256.0f * pixel[2])));
        }
    }

    return buffer;
}

static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("generateMSDF", Napi::Function::New(env, GenerateMSDF));
    return exports;
}

NODE_API_MODULE(msdfgen_napi, Init)
