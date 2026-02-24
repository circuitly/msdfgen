cmake_minimum_required(VERSION 3.15)
project(msdfgen-napi)

# cmake-js provides these variables
include_directories(${CMAKE_JS_INC})

# Ensure position-independent code for all targets (required for linking static lib into shared .node)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Build msdfgen core as a static library (no ext, no freetype, no dependencies)
set(MSDFGEN_CORE_ONLY ON CACHE BOOL "" FORCE)
set(MSDFGEN_BUILD_STANDALONE OFF CACHE BOOL "" FORCE)
set(MSDFGEN_INSTALL OFF CACHE BOOL "" FORCE)
set(MSDFGEN_USE_VCPKG OFF CACHE BOOL "" FORCE)
set(MSDFGEN_USE_CPP11 ON CACHE BOOL "" FORCE)
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/.. ${CMAKE_CURRENT_BINARY_DIR}/msdfgen)

# N-API addon shared library
add_library(${PROJECT_NAME} SHARED
    src/addon.cpp
    src/shape_parser.cpp
)

target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../
    ${CMAKE_CURRENT_SOURCE_DIR}/../core/
)

target_link_libraries(${PROJECT_NAME}
    msdfgen-core
    ${CMAKE_JS_LIB}
)

# node-addon-api headers (header-only, resolved from npm)
execute_process(
    COMMAND node -p "require('node-addon-api').include"
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    OUTPUT_VARIABLE NODE_ADDON_API_DIR
    OUTPUT_STRIP_TRAILING_WHITESPACE
)
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
target_include_directories(${PROJECT_NAME} PRIVATE ${NODE_ADDON_API_DIR})

# N-API version 8 for broad Node.js compatibility (Node 18+)
target_compile_definitions(${PROJECT_NAME} PRIVATE NAPI_VERSION=8)

# Output as .node file (native addon convention)
set_target_properties(${PROJECT_NAME} PROPERTIES
    PREFIX ""
    SUFFIX ".node"
)
