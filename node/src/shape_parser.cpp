#include "shape_parser.h"
#include "EdgeHolder.h"

namespace msdfgen_napi {

static msdfgen::Point2 ParsePoint(Napi::Object pt) {
    return msdfgen::Point2(
        pt.Get("x").As<Napi::Number>().DoubleValue(),
        pt.Get("y").As<Napi::Number>().DoubleValue()
    );
}

bool ParseShape(Napi::Env env, Napi::Object jsShape, msdfgen::Shape& outShape) {
    if (!jsShape.Has("contours") || !jsShape.Get("contours").IsArray()) {
        Napi::TypeError::New(env, "Shape must have a 'contours' array")
            .ThrowAsJavaScriptException();
        return false;
    }

    // Handle inverseYAxis flag (default: false = Y-up, standard for fonts)
    if (jsShape.Has("inverseYAxis") && jsShape.Get("inverseYAxis").IsBoolean()) {
        outShape.inverseYAxis = jsShape.Get("inverseYAxis").As<Napi::Boolean>().Value();
    }

    Napi::Array contours = jsShape.Get("contours").As<Napi::Array>();

    for (uint32_t i = 0; i < contours.Length(); i++) {
        Napi::Value contourVal = contours.Get(i);
        if (!contourVal.IsObject()) {
            Napi::TypeError::New(env, "Each contour must be an object")
                .ThrowAsJavaScriptException();
            return false;
        }

        Napi::Object jsContour = contourVal.As<Napi::Object>();
        if (!jsContour.Has("edges") || !jsContour.Get("edges").IsArray()) {
            Napi::TypeError::New(env, "Each contour must have an 'edges' array")
                .ThrowAsJavaScriptException();
            return false;
        }

        msdfgen::Contour& contour = outShape.addContour();
        Napi::Array edges = jsContour.Get("edges").As<Napi::Array>();

        for (uint32_t j = 0; j < edges.Length(); j++) {
            Napi::Value edgeVal = edges.Get(j);
            if (!edgeVal.IsObject()) {
                Napi::TypeError::New(env, "Each edge must be an object")
                    .ThrowAsJavaScriptException();
                return false;
            }

            Napi::Object jsEdge = edgeVal.As<Napi::Object>();
            if (!jsEdge.Has("type") || !jsEdge.Get("type").IsString()) {
                Napi::TypeError::New(env, "Each edge must have a 'type' string")
                    .ThrowAsJavaScriptException();
                return false;
            }
            if (!jsEdge.Has("points") || !jsEdge.Get("points").IsArray()) {
                Napi::TypeError::New(env, "Each edge must have a 'points' array")
                    .ThrowAsJavaScriptException();
                return false;
            }

            std::string type = jsEdge.Get("type").As<Napi::String>().Utf8Value();
            Napi::Array points = jsEdge.Get("points").As<Napi::Array>();

            if (type == "linear") {
                if (points.Length() != 2) {
                    Napi::TypeError::New(env, "Linear edge requires exactly 2 points")
                        .ThrowAsJavaScriptException();
                    return false;
                }
                contour.addEdge(msdfgen::EdgeHolder(
                    ParsePoint(points.Get(static_cast<uint32_t>(0)).As<Napi::Object>()),
                    ParsePoint(points.Get(static_cast<uint32_t>(1)).As<Napi::Object>())
                ));
            } else if (type == "quadratic") {
                if (points.Length() != 3) {
                    Napi::TypeError::New(env, "Quadratic edge requires exactly 3 points")
                        .ThrowAsJavaScriptException();
                    return false;
                }
                contour.addEdge(msdfgen::EdgeHolder(
                    ParsePoint(points.Get(static_cast<uint32_t>(0)).As<Napi::Object>()),
                    ParsePoint(points.Get(static_cast<uint32_t>(1)).As<Napi::Object>()),
                    ParsePoint(points.Get(static_cast<uint32_t>(2)).As<Napi::Object>())
                ));
            } else if (type == "cubic") {
                if (points.Length() != 4) {
                    Napi::TypeError::New(env, "Cubic edge requires exactly 4 points")
                        .ThrowAsJavaScriptException();
                    return false;
                }
                contour.addEdge(msdfgen::EdgeHolder(
                    ParsePoint(points.Get(static_cast<uint32_t>(0)).As<Napi::Object>()),
                    ParsePoint(points.Get(static_cast<uint32_t>(1)).As<Napi::Object>()),
                    ParsePoint(points.Get(static_cast<uint32_t>(2)).As<Napi::Object>()),
                    ParsePoint(points.Get(static_cast<uint32_t>(3)).As<Napi::Object>())
                ));
            } else {
                std::string msg = "Unknown edge type: '" + type + "'. Expected 'linear', 'quadratic', or 'cubic'";
                Napi::TypeError::New(env, msg).ThrowAsJavaScriptException();
                return false;
            }
        }
    }

    return true;
}

}
