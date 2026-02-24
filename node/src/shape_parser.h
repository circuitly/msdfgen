#pragma once

#include <napi.h>
#include "Shape.h"

namespace msdfgen_napi {

/// Parses a JavaScript Shape object into an msdfgen::Shape.
/// Returns false and throws a JS exception on error.
bool ParseShape(Napi::Env env, Napi::Object jsShape, msdfgen::Shape& outShape);

}
