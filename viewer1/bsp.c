#include <setjmp.h>
#include <stdarg.h>
#include <assert.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <malloc.h>
#include <math.h>
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#include <growable-buf/buf.h>
#include <linmath.h/linmath.h>
typedef float f32;
typedef double f64;
typedef uint8_t u8;
typedef uint16_t u16;
typedef uint32_t u32;
typedef uint64_t u64;
typedef int8_t s8;
typedef int16_t s16;
typedef int32_t s32;
typedef int64_t s64;
typedef float vec2[2];
typedef float vec3[3];
typedef float vec4[4];
typedef vec4 mat4[4];
typedef vec3 mat3[3];
#pragma pack(push, 1)
typedef struct lump_s {
  u32 filelen;
  u32 fileofs;
} lump_t;
#pragma pack(pop)
enum LumpType {
  LUMP_MATERIALS = 0,
  LUMP_LIGHTBYTES = 1,
  LUMP_LIGHTGRIDENTRIES = 2,
  LUMP_LIGHTGRIDCOLORS = 3,
  LUMP_PLANES = 4,
  LUMP_BRUSHSIDES = 5,
  LUMP_BRUSHES = 6,
  LUMP_TRIANGLES = 7,
  LUMP_DRAWVERTS = 8,
  LUMP_DRAWINDICES = 9,
  LUMP_CULLGROUPS = 10,
  LUMP_CULLGROUPINDICES = 11,
  LUMP_OBSOLETE_1 = 12,
  LUMP_OBSOLETE_2 = 13,
  LUMP_OBSOLETE_3 = 14,
  LUMP_OBSOLETE_4 = 15,
  LUMP_OBSOLETE_5 = 16,
  LUMP_PORTALVERTS = 17,
  LUMP_OCCLUDERS = 18,
  LUMP_OCCLUDERPLANES = 19,
  LUMP_OCCLUDEREDGES = 20,
  LUMP_OCCLUDERINDICES = 21,
  LUMP_AABBTREES = 22,
  LUMP_CELLS = 23,
  LUMP_PORTALS = 24,
  LUMP_NODES = 25,
  LUMP_LEAFS = 26,
  LUMP_LEAFBRUSHES = 27,
  LUMP_LEAFSURFACES = 28,
  LUMP_COLLISIONVERTS = 29,
  LUMP_COLLISIONEDGES = 30,
  LUMP_COLLISIONTRIS = 31,
  LUMP_COLLISIONBORDERS = 32,
  LUMP_COLLISIONPARTITIONS = 33,
  LUMP_COLLISIONAABBS = 34,
  LUMP_MODELS = 35,
  LUMP_VISIBILITY = 36,
  LUMP_ENTITIES = 37,
  LUMP_PATHCONNECTIONS = 38,
  LUMP_MAX = 39
};
const char *lumpnames[] = {
  [LUMP_MATERIALS] = "materials",
  [LUMP_LIGHTBYTES] = "lightmaps",
  [LUMP_LIGHTGRIDENTRIES] = "light grid hash",
  [LUMP_LIGHTGRIDCOLORS] = "light grid values",
  [LUMP_PLANES] = "planes",
  [LUMP_BRUSHSIDES] = "brushsides",
  [LUMP_BRUSHES] = "brushes",
  [LUMP_TRIANGLES] = "trianglesoups",
  [LUMP_DRAWVERTS] = "drawverts",
  [LUMP_DRAWINDICES] = "drawindexes",
  [LUMP_CULLGROUPS] = "cullgroups",
  [LUMP_CULLGROUPINDICES] = "cullgroupindexes",
  [LUMP_OBSOLETE_1] = "shadowverts",
  [LUMP_OBSOLETE_2] = "shadowindices",
  [LUMP_OBSOLETE_3] = "shadowclusters",
  [LUMP_OBSOLETE_4] = "shadowaabbtrees",
  [LUMP_OBSOLETE_5] = "shadowsources",
  [LUMP_PORTALVERTS] = "portalverts",
  [LUMP_OCCLUDERS] = "occluders",
  [LUMP_OCCLUDERPLANES] = "occluderplanes",
  [LUMP_OCCLUDEREDGES] = "occluderedges",
  [LUMP_OCCLUDERINDICES] = "occluderindexes",
  [LUMP_AABBTREES] = "aabbtrees",
  [LUMP_CELLS] = "cells",
  [LUMP_PORTALS] = "portals",
  [LUMP_NODES] = "nodes",
  [LUMP_LEAFS] = "leafs",
  [LUMP_LEAFBRUSHES] = "leafbrushes",
  [LUMP_LEAFSURFACES] = "leafsurfaces",
  [LUMP_COLLISIONVERTS] = "collisionverts",
  [LUMP_COLLISIONEDGES] = "collisionedges",
  [LUMP_COLLISIONTRIS] = "collisiontris",
  [LUMP_COLLISIONBORDERS] = "collisionborders",
  [LUMP_COLLISIONPARTITIONS] = "collisionparts",
  [LUMP_COLLISIONAABBS] = "collisionaabbs",
  [LUMP_MODELS] = "models",
  [LUMP_VISIBILITY] = "visibility",
  [LUMP_ENTITIES] = "entdata",
  [LUMP_PATHCONNECTIONS] = "paths",
  NULL
};
#pragma pack(push, 1)
typedef struct dheader_s {
  u8 ident[4];
  u32 version;
  lump_t lumps[LUMP_MAX];
} dheader_t;
typedef struct {
  char material[64];
  u32 surfaceFlags;
  u32 contentFlags;
} dmaterial_t;
typedef struct {
  u16 materialIndex;
  u16 lightmapIndex;
  u32 firstVertex;
  u16 vertexCount;
  u16 indexCount;
  u32 firstIndex;
} DiskTriangleSoup;
typedef struct {
  vec3 xyz;
  vec3 normal;
  u32 color;
  vec2 texCoord;
  vec2 lmapCoord;
  vec3 tangent;
  vec3 binormal;
} DiskGfxVertex;
typedef struct {
  u8 r, g, b, a;
} RGBA;
typedef struct {
  RGBA r[512 * 512];
  RGBA g[512 * 512];
  RGBA b[512 * 512];
  u8 shadowMap[1024 * 1024];
} DiskGfxLightmap;
typedef struct {
  s32 planeNum; // Plane index.
  s32 children[2]; // Children indices. Negative numbers are leaf indices: -(leaf+1). 
  s32 mins[3]; // Integer bounding box min coord. 
  s32 maxs[3]; // Integer bounding box max coord. 
} dnode_t;
typedef struct {
  vec3 normal;
  f32 dist;
} DiskPlane;
typedef struct {
  u16 numSides;
  u16 materialNum;
} DiskBrush;
typedef struct {
  s32 plane;
  s32 materialNum;
} cbrushside_t;
typedef struct {
  s32 checkStamp;
  vec3 xyz;
} DiskCollisionVertex;
typedef struct {
  s32 checkStamp;
  vec3 origin;
  vec3 axis[3];
  u32 length;
} DiskCollisionEdge;
typedef struct {
  vec3 distEq;
  s32 zBase;
  s32 zSlope;
  s32 start;
  s32 length;
} DiskCollisionBorder;
typedef struct {
  u16 checkStamp;
  u8 triCount;
  u8 borderCount;
  u32 firstTriIndex;
  u32 firstBorderIndex;
} DiskCollisionPartition;
typedef struct {
  vec3 mins;
  vec3 maxs;
  u32 firstTriangle;
  u32 numTriangles;
  u32 firstSurface;
  u32 numSurfaces;
  u32 firstBrush;
  u32 numBrushes;
} dmodel_t;
typedef union {
  s32 firstChildIndex;
  s32 partitionIndex;
} CollisionAabbTreeIndex;
typedef struct {
  vec3 origin;
  vec3 halfSize;
  s16 materialIndex;
  s16 childCount;
  CollisionAabbTreeIndex u;
} DiskCollisionAabbTree;
typedef struct {
  vec4 plane;
  vec4 svec;
  vec4 tvec;
  u32 vertIndices[3];
  u32 edgeIndices[3];
} DiskCollisionTriangle;
/*
The leafs lump stores the leaves of the map's BSP tree.
Each leaf is a convex region that contains, among other things,
a cluster index (for determining the other leafs potentially visible from within the leaf),
a list of faces (for rendering), and a list of brushes (for collision detection).
There are a total of length / sizeof(leaf) records in the lump, where length is the size of the lump itself, as specified in the lump directory. 
*/
typedef struct {
  s32 cluster; // If cluster is negative, the leaf is outside the map or otherwise invalid.
  s32 area;
  s32 firstLeafSurface;
  u32 numLeafSurfaces;
  s32 firstLeafBrush;
  u32 numLeafBrushes;
  s32 cellNum;
  s32 firstLightIndex;
  u32 numLights;
} dleaf_t;
typedef struct {
  s32 brush;
} dleafbrush_t;
typedef struct {
  s32 face;
} dleafface_t;
typedef struct {
  u16 vertex[3];
} DiskGfxTriangle;
typedef struct {
  vec3 mins, maxs;
  s32 firstSurface;
  s32 surfaceCount;
} DiskGfxCullGroup;
typedef struct {
  vec3 mins, maxs;
  s32 aabbTreeIndex;
  s32 firstPortal;
  s32 portalCount;
  s32 firstCullGroup;
  s32 cullGroupCount;
  s32 firstOccluder;
  s32 occluderCount;
} DiskGfxCell;
typedef struct {
  vec3 xyz;
} DiskGfxPortalVertex;
typedef struct {
  u32 planeIndex;
  u32 cellIndex;
  u32 firstPortalVertex;
  u32 portalVertexCount;
} DiskGfxPortal;
typedef struct {
  s32 firstSurface;
  s32 surfaceCount;
  s32 childCount;
} DiskGfxAabbTree;
#pragma pack(pop)
const size_t lumpsizes[] = {
  [LUMP_MATERIALS] = sizeof(dmaterial_t),
  [LUMP_LIGHTBYTES] = sizeof(DiskGfxLightmap),
  [LUMP_LIGHTGRIDENTRIES] = 0,
  [LUMP_LIGHTGRIDCOLORS] = 0,
  [LUMP_PLANES] = sizeof(DiskPlane),
  [LUMP_BRUSHSIDES] = sizeof(cbrushside_t),
  [LUMP_BRUSHES] = sizeof(DiskBrush),
  [LUMP_TRIANGLES] = sizeof(DiskTriangleSoup),
  [LUMP_DRAWVERTS] = sizeof(DiskGfxVertex),
  [LUMP_DRAWINDICES] = sizeof(u16),
  [LUMP_CULLGROUPS] = sizeof(DiskGfxCullGroup),
  [LUMP_CULLGROUPINDICES] = 0,
  [LUMP_OBSOLETE_1] = 0,
  [LUMP_OBSOLETE_2] = 0,
  [LUMP_OBSOLETE_3] = 0,
  [LUMP_OBSOLETE_4] = 0,
  [LUMP_OBSOLETE_5] = 0,
  [LUMP_PORTALVERTS] = sizeof(DiskGfxPortalVertex),
  [LUMP_OCCLUDERS] = 0,
  [LUMP_OCCLUDERPLANES] = 0,
  [LUMP_OCCLUDEREDGES] = 0,
  [LUMP_OCCLUDERINDICES] = 0,
  [LUMP_AABBTREES] = sizeof(DiskGfxAabbTree),
  [LUMP_CELLS] = sizeof(DiskGfxCell),
  [LUMP_PORTALS] = sizeof(DiskGfxPortal),
  [LUMP_NODES] = sizeof(dnode_t),
  [LUMP_LEAFS] = sizeof(dleaf_t),
  [LUMP_LEAFBRUSHES] = sizeof(dleafbrush_t),
  [LUMP_LEAFSURFACES] = sizeof(dleafface_t),
  [LUMP_COLLISIONVERTS] = sizeof(DiskCollisionVertex),
  [LUMP_COLLISIONEDGES] = sizeof(DiskCollisionEdge),
  [LUMP_COLLISIONTRIS] = sizeof(DiskCollisionTriangle),
  [LUMP_COLLISIONBORDERS] = sizeof(DiskCollisionBorder),
  [LUMP_COLLISIONPARTITIONS] = sizeof(DiskCollisionPartition),
  [LUMP_COLLISIONAABBS] = sizeof(DiskCollisionAabbTree),
  [LUMP_MODELS] = sizeof(dmodel_t),
  [LUMP_VISIBILITY] = 1,
  [LUMP_ENTITIES] = 1,
  [LUMP_PATHCONNECTIONS] = 0
};
typedef struct {
  void *data;
  size_t count;
} LumpData;
enum {
  PARSE_NODE_DEPTH_ROOT,
  PARSE_NODE_DEPTH_ENTITY,
  PARSE_NODE_DEPTH_BRUSH
};
typedef struct KeyValuePair_s {
  // struct KeyValuePair_s *next;
  char *key;
  char *value;
} KeyValuePair;
typedef struct Entity_s {
  KeyValuePair *keyvalues;
} Entity;
enum {
  STREAM_SEEK_BEG,
  STREAM_SEEK_CUR,
  STREAM_SEEK_END
};
typedef struct Stream_s {
  void *ctx;
  int64_t (*tell)(struct Stream_s *s);
  /* This function returns zero if successful, or else it returns a non-zero value. */
  int (*seek)(struct Stream_s *s, int64_t offset, int whence);
  int (*name)(struct Stream_s *stream, char *buffer, size_t size);
  int (*eof)(struct Stream_s *stream);
  size_t (*read)(struct Stream_s *stream, void *ptr, size_t size, size_t nmemb);
} Stream;
typedef struct {
    char path[256];
  FILE *fp;
} StreamFile;
typedef struct {
  size_t offset, length;
  unsigned char *buffer;
} StreamBuffer;
LumpData lumpdata[LUMP_MAX];
Entity *parse_entities() {
  Stream s = {0};
  StreamBuffer sb = {0};
  init_stream_from_buffer(&s, &sb, lumpdata[LUMP_ENTITIES].data, lumpdata[LUMP_ENTITIES].count);
  char line[2048];
  unsigned int node_depth = PARSE_NODE_DEPTH_ROOT;
  Entity *entities = NULL;
  Entity *entity   = NULL;
  while(!stream_read_line(&s, line, sizeof(line))) {
    size_t offsz = 0;
    while(line[offsz] && line[offsz] == ' ')
      offsz++;
    switch(line[offsz]) {
      case '{':
        ++node_depth;
        assert(node_depth == PARSE_NODE_DEPTH_ENTITY);
        buf_push(entities, (Entity) { 0 });
        entity = &entities[buf_size(entities) - 1];
      break;
      case '}':
        assert(node_depth != PARSE_NODE_DEPTH_ROOT);
        --node_depth;
      break;
      case '(':
      {
                fprintf(stderr, "No support for parsing brushes.\n");
                exit(1);
      } break;
      case '"':
      {
        if(node_depth == PARSE_NODE_DEPTH_ENTITY)
        {
                    char key[512];
                    char value[512];
          sscanf(line, "\"%511[^\"]\" \"%511[^\"]\"", key, value);
          assert(entity);
          buf_push(entity->keyvalues, (KeyValuePair) { 0 });
          KeyValuePair *kvp = &entity->keyvalues[buf_size(entity->keyvalues) - 1];
                    // Leaking memory, but fine for this particular instance.
                    kvp->key = strdup(key);
                    kvp->value = strdup(value);
        }
      } break;
    }
  }
  return entities;
}
size_t stream_read_(struct Stream_s *stream, void *ptr, size_t size, size_t nmemb) {
  StreamFile *sd = (StreamFile *)stream->ctx;
  return fread(ptr, size, nmemb, sd->fp);
}
size_t stream_write_(struct Stream_s *stream, const void *ptr, size_t size, size_t nmemb) {
  StreamFile *sd = (StreamFile *)stream->ctx;
  return fwrite(ptr, size, nmemb, sd->fp);
}
int stream_eof_(struct Stream_s *stream) {
  StreamFile *sd = (StreamFile *)stream->ctx;
  return feof(sd->fp);
}
int stream_name_(struct Stream_s *s, char *buffer, size_t size) {
  StreamFile *sd = (StreamFile *)s->ctx;
  snprintf(buffer, size, "%s", sd->path);
  return 0;
}
int64_t stream_tell_(struct Stream_s *s) {
  StreamFile *sd = (StreamFile *)s->ctx;
  return ftell(sd->fp);
}
int stream_seek_(struct Stream_s *s, int64_t offset, int whence) {
  StreamFile *sd = (StreamFile *)s->ctx;
  switch(whence) {
    case STREAM_SEEK_BEG:
    {
            return fseek(sd->fp, offset, SEEK_SET);
    }
    break;
    case STREAM_SEEK_CUR:
    {
            return fseek(sd->fp, offset, SEEK_CUR);
    }
    break;
    case STREAM_SEEK_END:
    {
            return fseek(sd->fp, offset, SEEK_END);
    }
    break;
  }
  return 0;
}
int stream_open_file(Stream *s, const char *path, const char *mode) {
    FILE *fp = fopen(path, mode);
    if(!fp)
        return 1;
    StreamFile *sf = malloc(sizeof(StreamFile));
    sf->fp = fp;
    snprintf(sf->path, sizeof(sf->path), "%s", path);
  s->ctx = sf;
  s->read = stream_read_;
  // s->write = stream_write_;
  s->eof = stream_eof_;
  s->name = stream_name_;
  s->tell = stream_tell_;
  s->seek = stream_seek_;
    return 0;
}
int stream_close_file(Stream *s) {
    if(!s->ctx) {
        return 1;
    }
    StreamFile *sf = s->ctx;
    fclose(sf->fp);
    free(sf);
    s->ctx = NULL;
    return 0;
}
size_t stream_read_buffer(Stream *s, void *ptr, size_t n) {
  return s->read(s, ptr, n, 1);
}
#define stream_read(s, ptr) stream_read_buffer(&(s), &(ptr), sizeof(ptr))
int stream_read_line(Stream *s, char *line, size_t max_line_length) {
  size_t n = 0;
  line[n] = 0;
  int eol = 0;
  int eof = 0;
  size_t offset = 0;
  while(!eol)
  {
    uint8_t ch = 0;
    if(0 == s->read(s, &ch, 1, 1) || !ch)
    {
      eof = 1;
      break;
    }
    if(n + 1 >= max_line_length) // n + 1 account for \0
    {
      break;
    }
    switch(ch)
    {
      case '\r': break;
      case '\n': eol = 1; break;
      default: line[n++] = ch; break;
    }
  }
  line[n] = 0;
  return eof;
}
size_t stream_read_buffer_(struct Stream_s *stream, void *ptr, size_t size, size_t nmemb) {
  StreamBuffer *sd = (StreamBuffer *)stream->ctx;
  size_t nb = size * nmemb;
  if(sd->offset + nb > sd->length)
  {
    return 0; // EOF
  }
  memcpy(ptr, &sd->buffer[sd->offset], nb);
  sd->offset += nb;
  return nmemb;
}
size_t stream_write_buffer_(struct Stream_s *stream, const void *ptr, size_t size, size_t nmemb) {
  StreamBuffer *sd = (StreamBuffer *)stream->ctx;
  size_t nb = size * nmemb;
  if(sd->offset + nb > sd->length) {
    return 0; // EOF
  }
  memcpy(&sd->buffer[sd->offset], ptr, nb);
  sd->offset += nb;
  return nmemb;
}
int stream_eof_buffer_(struct Stream_s *stream) {
  StreamBuffer *sd = (StreamBuffer *)stream->ctx;
  return sd->offset >= sd->length;
}
int stream_name_buffer_(struct Stream_s *s, char *buffer, size_t size) {
  StreamBuffer *sd = (StreamBuffer *)s->ctx;
  buffer[0] = 0;
  return 0;
}
int64_t stream_tell_buffer_(struct Stream_s *s) {
  StreamBuffer *sd = (StreamBuffer *)s->ctx;
  return sd->offset;
}
int stream_seek_buffer_(struct Stream_s *s, int64_t offset, int whence) {
  StreamBuffer *sd = (StreamBuffer *)s->ctx;
  switch(whence) {
    case STREAM_SEEK_BEG:
    {
      sd->offset = sd->length == 0 ? 0 : offset % sd->length;
    }
    break;
    case STREAM_SEEK_CUR:
    {
      sd->offset = sd->length == 0 ? 0 : (sd->offset + offset) % sd->length;
    }
    break;
    case STREAM_SEEK_END:
    {
      sd->offset = sd->length;
    }
    break;
  }
  return 0;
}
int init_stream_from_stream_buffer(Stream *s, StreamBuffer *sb) {
  s->ctx = sb;
  s->read = stream_read_buffer_;
  // s->write = stream_write_buffer_;
  s->eof = stream_eof_buffer_;
  s->name = stream_name_buffer_;
  s->tell = stream_tell_buffer_;
  s->seek = stream_seek_buffer_;
  return 0;
}
int init_stream_from_buffer(Stream *s, StreamBuffer *sb, unsigned char *buffer, size_t length) {
  sb->offset = 0;
  sb->length = length;
  sb->buffer = buffer;
  s->ctx = sb;
  s->read = stream_read_buffer_;
  // s->write = stream_write_buffer_;
  s->eof = stream_eof_buffer_;
  s->name = stream_name_buffer_;
  s->tell = stream_tell_buffer_;
  s->seek = stream_seek_buffer_;
  return 0;
}
typedef struct {
  bool print_info;
  bool export_to_map;
  const char *input_file;
  const char *format;
  const char *export_file;
  bool try_fix_portals;
  bool exclude_patches;
} ProgramOptions;
LumpData lumpdata[LUMP_MAX];
s64 filelen;
Entity *entities;
void info(dheader_t *hdr, int type, int *count) {
  lump_t *l = &hdr->lumps[type];
  char amount[256] = { 0 };
  if (count) {
    snprintf(amount, sizeof(amount), "%6d", *count);
  } else {
    if (lumpsizes[type] == 0)
      snprintf(amount, sizeof(amount), "     ?");
    else if (lumpsizes[type] == 1)
    {
      snprintf(amount, sizeof(amount), "      ");
    }
    else if (lumpsizes[type] > 1)
    {
      snprintf(amount, sizeof(amount), "%6d", l->filelen / lumpsizes[type]);
    }
  }
  printf("%s %-19s %6d B\t%2d KB %5.1f%%\n",
    amount,
    lumpnames[type],
    l->filelen,
    (int)ceilf((float)l->filelen / 1000.f),
    (float)l->filelen / (float)filelen * 100.f);
}
void test(const char *type, size_t a, size_t b) {
  if (a != b) {
    fprintf(stderr, "%d != %d, sizeof(%s) = %d\n", a, b, type, a);
    exit(1);
  }
}
#define TEST(a, b) test(#a, sizeof(a), b)
void planes_from_aabb(vec3 mins, vec3 maxs, DiskPlane planes[6]) {
  planes[0].normal[0] = -1.0f;
  planes[0].normal[1] = 0.0f;
  planes[0].normal[2] = 0.0f;
  planes[0].dist = -mins[0];
  planes[1].normal[0] = 1.0f;
  planes[1].normal[1] = 0.0f;
  planes[1].normal[2] = 0.0f;
  planes[1].dist = maxs[0];
  planes[2].normal[0] = 0.0f;
  planes[2].normal[1] = -1.0f;
  planes[2].normal[2] = 0.0f;
  planes[2].dist = -mins[1];
  planes[3].normal[0] = 0.0f;
  planes[3].normal[1] = 1.0f;
  planes[3].normal[2] = 0.0f;
  planes[3].dist = maxs[1];
  planes[4].normal[0] = 0.0f;
  planes[4].normal[1] = 0.0f;
  planes[4].normal[2] = -1.0f;
  planes[4].dist = -mins[2];
  planes[5].normal[0] = 0.0f;
  planes[5].normal[1] = 0.0f;
  planes[5].normal[2] = 1.0f;
  planes[5].dist = maxs[2];
}
void write_plane(FILE *fp, const char *material, vec3 n, float dist, vec3 origin) {
  vec3 tangent, bitangent;
  vec3 up = { 0, 0, 1.f };
  vec3 fw = { 0, 1.f, 0 };
  float d = vec3_mul_inner(up, n);
  if (fabs(d) < 0.01f) {
    vec3_mul_cross(tangent, n, up);
  } else {
    vec3_mul_cross(tangent, n, fw);
  }
  vec3_mul_cross(bitangent, n, tangent);
  vec3 a, b, c;
  vec3 t;
  vec3_scale(a, n, dist);
  vec3_scale(t, tangent, 100.f);
  vec3_add(b, a, t);
  vec3_scale(t, bitangent, 100.f);
  vec3_add(c, a, t);
  fprintf(
    fp,
    " ( %f %f %f ) ( %f %f %f ) ( %f %f %f ) %s 128 128 0 0 0 0 lightmap_gray 16384 16384 0 "
    "0 0 0\n",
    c[0] + origin[0],
    c[1] + origin[1],
    c[2] + origin[2],
    b[0] + origin[0],
    b[1] + origin[1],
    b[2] + origin[2],
    a[0] + origin[0],
    a[1] + origin[1],
    a[2] + origin[2],
    material ? material : "caulk"
  );
}
const char *entity_key_by_value(Entity *ent, const char *key) {
  for (size_t i = 0; i < buf_size(ent->keyvalues); ++i) {
    if (!strcmp(ent->keyvalues[i].key, key))
      return ent->keyvalues[i].value;
  }
  return "";
}
typedef struct {
  s32 vertex[3];
} Triangle;
typedef struct {
  Triangle *triangles;
  s32 materialIndex;
} Patch;
int triangle_vertex_compare(const void *a, const void *b) {
  return (*(int *)a - *(int *)b);
}
// vertices should be sorted
bool patch_has_triangle(Patch *patch, int *vertices) {
  for (size_t i = 0; i < buf_size(patch->triangles); ++i) {
    Triangle *tri = &patch->triangles[i];
    if (tri->vertex[0] == vertices[0] && tri->vertex[1] == vertices[1] && tri->vertex[2] == vertices[2])
      return true;
  }
  return false;
}
bool patches_has_triangle(Patch *patches, int *vertices) {
  for (size_t i = 0; i < buf_size(patches); ++i) {
    if (patch_has_triangle(&patches[i], vertices))
      return true;
  }
  return false;
}
bool vec3_fuzzy_zero(float *v) {
  float e = 0.0001f;
  return fabs(v[0]) < e && fabs(v[1]) < e && fabs(v[2]) < e;
}
void write_patches(FILE *fp) {
  dmaterial_t *materials = (dmaterial_t*)lumpdata[LUMP_MATERIALS].data;
  DiskCollisionVertex *vertices = lumpdata[LUMP_COLLISIONVERTS].data;
  DiskCollisionTriangle *tris = lumpdata[LUMP_COLLISIONTRIS].data;
  DiskCollisionAabbTree *collaabbtrees = lumpdata[LUMP_COLLISIONAABBS].data;
  DiskCollisionPartition *collpartitions = lumpdata[LUMP_COLLISIONPARTITIONS].data;
  Patch *patches = NULL;
  Patch *patch = NULL;
  for (size_t i = 0; i < lumpdata[LUMP_COLLISIONAABBS].count; ++i) {
    DiskCollisionAabbTree *tree = &collaabbtrees[i];
    DiskCollisionPartition *part = &collpartitions[tree->u.partitionIndex];
    if (tree->childCount > 0)
      continue;
    bool created_new_patch = false;
    if (part->triCount > 0) {
      for (size_t j = 0; j < part->triCount; ++j) {
        DiskCollisionTriangle *tri = &tris[part->firstTriIndex + j];
        Triangle triangle;
        triangle.vertex[0] = tri->vertIndices[0];
        triangle.vertex[1] = tri->vertIndices[1];
        triangle.vertex[2] = tri->vertIndices[2];
        if (vec3_fuzzy_zero(vertices[triangle.vertex[0]].xyz)
           || vec3_fuzzy_zero(vertices[triangle.vertex[1]].xyz)
           || vec3_fuzzy_zero(vertices[triangle.vertex[2]].xyz)) {
          continue;
        }
        if (patch && buf_size(patch->triangles) >= 7) {
          buf_push(patches, ((Patch) { .triangles = NULL, .materialIndex = tree->materialIndex }));
          patch = &patches[buf_size(patches) - 1];
          created_new_patch = true;
        }
        qsort(triangle.vertex, 3, sizeof(int), triangle_vertex_compare);
        if (!patches_has_triangle(patches, triangle.vertex)) {
          if (!created_new_patch) {
            buf_push(patches, ((Patch) { .triangles = NULL, .materialIndex = tree->materialIndex }));
            patch = &patches[buf_size(patches) - 1];
            created_new_patch = true;
          }
          buf_push(patch->triangles, triangle);
        }
      }
    }
  }
  // TODO: better way of converting triangles into patches
  for (size_t i = 0; i < buf_size(patches); ++i) {
    Patch *patch = &patches[i];
    if (buf_size(patch->triangles) == 0)
      continue;
    fprintf(fp, "  {\n");
    fprintf(fp, "   mesh\n");
    fprintf(fp, "   {\n");
    fprintf(fp, "   %s\n", materials[patch->materialIndex].material);
    // TODO: write contentFlags and contentFlags info
    fprintf(fp, "   lightmap_gray\n");
    fprintf(fp, "   %d 2 16 8\n", buf_size(patch->triangles) * 2);
    for (size_t j = 0; j < buf_size(patch->triangles); ++j) {
      Triangle *tri = &patch->triangles[j];
      DiskCollisionVertex *v1 = &vertices[tri->vertex[0]];
      DiskCollisionVertex *v2 = &vertices[tri->vertex[1]];
      DiskCollisionVertex *v3 = &vertices[tri->vertex[2]];
      fprintf(fp, "   (\n");
      fprintf(fp, "  v %f %f %f t -1024 1024 -4 4\n", v1->xyz[0], v1->xyz[1], v1->xyz[2]);
      fprintf(fp, "  v %f %f %f t -1024 1024 -4 4\n", v2->xyz[0], v2->xyz[1], v2->xyz[2]);
      fprintf(fp, "   )\n");
      fprintf(fp, "   (\n");
      fprintf(fp, "  v %f %f %f t -1024 1024 -4 4\n", v3->xyz[0], v3->xyz[1], v3->xyz[2]);
      fprintf(fp, "  v %f %f %f t -1024 1024 -4 4\n", v1->xyz[0], v1->xyz[1], v1->xyz[2]);
      fprintf(fp,"   )\n");
    }
    fprintf(fp, "   }\n");
    fprintf(fp, "  }\n");
  }
}
void triangle_normal(vec3 n, const vec3 a, const vec3 b, const vec3 c) {
  vec3 e1, e2;
  vec3_sub(e1, b, a);
  vec3_sub(e2, c, a);
  vec3_mul_cross(n, e1, e2);
  vec3_norm(n, n);
}
bool vec3_fuzzy_eq(float *a, float *b) {
  for (size_t k = 0; k < 3; ++k) {
    if (fabs(a[k] - b[k]) > 0.0001)
      return false;
  }
  return true;
}
void write_portals(FILE *fp) {
  DiskGfxPortal *portals = lumpdata[LUMP_PORTALS].data;
  DiskGfxPortalVertex *vertices = lumpdata[LUMP_PORTALVERTS].data;
  DiskPlane *planes = (DiskPlane*)lumpdata[LUMP_PLANES].data;
  int *written = malloc(lumpdata[LUMP_PORTALS].count * sizeof(int));
  memset(written, -1, lumpdata[LUMP_PORTALS].count * sizeof(int));
  size_t written_count = 0;
  for (size_t i = 0; i < lumpdata[LUMP_PORTALS].count; ++i) {
    DiskGfxPortal *portal = &portals[i];
    bool found = false;
    for (size_t k = 0; k < written_count; ++k) {
      DiskGfxPortal *other = &portals[written[k]];
      if (other->portalVertexCount != portal->portalVertexCount)
        continue;
      size_t match_count = 0;
      for (size_t g = 0; g < other->portalVertexCount; ++g) {
        for (size_t h = 0; h < portal->portalVertexCount; ++h) {
          if (vec3_fuzzy_eq(vertices[portal->firstPortalVertex + h].xyz, vertices[other->firstPortalVertex + g].xyz))
            ++match_count;
        }
      }
      if (match_count == portal->portalVertexCount) {
        found = true;
        break;
      }
    }
    if (found)
      continue;
    fprintf(fp, "{\n");
    written[written_count++] = i;
    DiskPlane *plane = &planes[portal->planeIndex];
    vec3 portal_normal;
    triangle_normal(portal_normal, vertices[portal->firstPortalVertex].xyz, vertices[portal->firstPortalVertex + 1].xyz, vertices[portal->firstPortalVertex + 2].xyz);
    float portal_distance = vec3_mul_inner(portal_normal, vertices[portal->firstPortalVertex].xyz);
    write_plane(fp, "portal", portal_normal, portal_distance, (vec3) { 0.f, 0.f, 0.f });
    for (int k = 0; k < 3; ++k) {
      portal_normal[k] = -portal_normal[k];
    }
    write_plane(fp, "portal_nodraw", portal_normal, -portal_distance + 8.f, (vec3) { 0.f, 0.f, 0.f });
    for (size_t i = 0; i < portal->portalVertexCount; ++i) {
      DiskGfxPortalVertex *a = &vertices[portal->firstPortalVertex + i];
      int next_idx = i + 1 >= portal->portalVertexCount ? 0 : i + 1;
      DiskGfxPortalVertex *b = &vertices[portal->firstPortalVertex + next_idx];
      vec3 ba;
      vec3_sub(ba, b->xyz, a->xyz);
      vec3_norm(ba, ba);
      vec3 n;
      vec3_mul_cross(n, ba, plane->normal);
      float d = vec3_mul_inner(n, a->xyz);
      for (int k = 0; k < 3; ++k)
        n[k] = -n[k];
      write_plane(fp, "portal_nodraw", n, -d, (vec3) { 0.f, 0.f, 0.f });
    }
    fprintf(fp, "}\n");
  }
}
bool ignore_material(const char *material) {
  static const char *ignored[] = {"portal", "portal_nodraw", NULL};
  for (size_t i = 0; ignored[i]; ++i) {
    if (!strcmp(material, ignored[i]))
      return true;
  }
  return false;
}
typedef struct {
  vec3 normal;
  float distance;
  char material[256];
} MapPlane;
typedef struct {
  vec3 mins, maxs;
  MapPlane *planes;
} MapBrush;
typedef struct {
  vec3 *points;
  uint32_t *indices;
  vec2 *uvs;
  MapPlane *plane;
} Polygon;
MapBrush *mapbrushes = NULL;
void map_planes_from_aabb(vec3 mins, vec3 maxs, MapPlane planes[6]) {
  planes[0].normal[0] = -1.0f;
  planes[0].normal[1] = 0.0f;
  planes[0].normal[2] = 0.0f;
  planes[0].distance = -mins[0];
  planes[1].normal[0] = 1.0f;
  planes[1].normal[1] = 0.0f;
  planes[1].normal[2] = 0.0f;
  planes[1].distance = maxs[0];
  planes[2].normal[0] = 0.0f;
  planes[2].normal[1] = -1.0f;
  planes[2].normal[2] = 0.0f;
  planes[2].distance = -mins[1];
  planes[3].normal[0] = 0.0f;
  planes[3].normal[1] = 1.0f;
  planes[3].normal[2] = 0.0f;
  planes[3].distance = maxs[1];
  planes[4].normal[0] = 0.0f;
  planes[4].normal[1] = 0.0f;
  planes[4].normal[2] = -1.0f;
  planes[4].distance = -mins[2];
  planes[5].normal[0] = 0.0f;
  planes[5].normal[1] = 0.0f;
  planes[5].normal[2] = 1.0f;
  planes[5].distance = maxs[2];
}
void load_map_brushes() {
  size_t side_offset = 0;
  LumpData *brushes = &lumpdata[LUMP_BRUSHES];
  cbrushside_t *brushsides = (cbrushside_t*)lumpdata[LUMP_BRUSHSIDES].data;
  dmaterial_t *materials = (dmaterial_t*)lumpdata[LUMP_MATERIALS].data;
  DiskPlane *diskplanes = (DiskPlane*)lumpdata[LUMP_PLANES].data;
  for (size_t i = 0; i < brushes->count; ++i) {
    MapBrush dst = { 0 };
    DiskBrush *src = &((DiskBrush*)brushes->data)[i];
    cbrushside_t *sides = &brushsides[side_offset];
    size_t numsides = src->numSides - 6;
    s32 axialMaterialNum[6] = {0};
    for (size_t axis = 0; axis < 3; axis++) {
      for (size_t sign = 0; sign < 2; sign++) {
        union f2i {
          float f;
          int i;
        } u;
        u.i = brushsides[side_offset].plane;
        axialMaterialNum[sign + axis * 2] = brushsides[side_offset].materialNum;
        float f = u.f;
        if (sign) {
          dst.maxs[axis] = f;
        } else {
          dst.mins[axis] = f;
        }
        ++side_offset;
      }
    }
    MapPlane axial_planes[6];
    map_planes_from_aabb(dst.mins, dst.maxs, axial_planes);
    for (size_t h = 0; h < 6; ++h) {
      MapPlane *plane = &axial_planes[h];
      snprintf(plane->material, sizeof(plane->material), "%s", materials[axialMaterialNum[h]].material);
      buf_push(dst.planes, *plane);
    }
    for (size_t k = 0; k < numsides; ++k) {
      cbrushside_t *side = &brushsides[side_offset + k];
      DiskPlane *diskplane = &diskplanes[side->plane];
      MapPlane plane = {0};
      plane.distance = diskplane->dist;
      snprintf(plane.material, sizeof(plane.material), "%s", materials[side->materialNum].material);
      vec3_dup(plane.normal, diskplane->normal);
      buf_push(dst.planes, plane);
    }
    buf_push(mapbrushes, dst);
    side_offset += numsides;
  }
}
float mat3_determinant(mat3 m) {
  return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
       + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
}
bool mat3_inverse(mat3 result, mat3 m) {
  float a, b, c, d, e, f, g, h, i;
  a = m[0][0];
  b = m[0][1];
  c = m[0][2];
  d = m[1][0];
  e = m[1][1];
  f = m[1][2];
  g = m[2][0];
  h = m[2][1];
  i = m[2][2];
  float det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (det == 0.0) {
    return false;
  }
  float inv_det = 1.f / det;
  result[0][0] = (e * i - f * h) * inv_det;
  result[0][1] = (c * h - b * i) * inv_det;
  result[0][2] = (b * f - c * e) * inv_det;
  result[1][0] = (f * g - d * i) * inv_det;
  result[1][1] = (a * i - c * g) * inv_det;
  result[1][2] = (c * d - a * f) * inv_det;
  result[2][0] = (d * h - e * g) * inv_det;
  result[2][1] = (b * g - a * h) * inv_det;
  result[2][2] = (a * e - b * d) * inv_det;
  return true;
}
void mat3_vec3_mul(vec3 result, mat3 m, vec3 v) {
  result[0] = result[1] = result[2] = 0.f;
  for (size_t i = 0; i < 3; ++i) {
    for (size_t j = 0; j < 3; ++j) {
      result[i] = result[i] + m[i][j] * v[j];
    }
  }
}
bool polygon_has_pt(Polygon *polygon, vec3 pt) {
  for (size_t i = 0; i < buf_size(polygon->points); ++i) {
    vec3 v;
    vec3_sub(v, pt, polygon->points[i]);
    if (vec3_len(v) < 0.001)
      return true;
  }
  return false;
}
#define buf_set_size(v, new_size)                                                                         \
  do {                                                                                                    \
    if (v) {                                                                                               \
      buf_ptr((v))->size = (size_t)new_size > buf_ptr((v))->capacity ? buf_ptr((v))->capacity : new_size; \
    }                                                                                                     \
  } while(0)
bool polygonize_brush(MapBrush *brush, Polygon **polygons_out) {
  Polygon *polygons = NULL;
  size_t plane_count = buf_size(brush->planes);
  for (size_t i = 0; i < plane_count; ++i) {
    MapPlane *p0 = &brush->planes[i];
    Polygon polygon = { 0 };
    polygon.plane = p0;
    for (size_t j = 0; j < plane_count; ++j) {
      if (j == i)
        continue;
      for (size_t k = 0; k < plane_count; ++k) {
        MapPlane *p1 = &brush->planes[j];
        MapPlane *p2 = &brush->planes[k];
        if (j == k || i == k)
          continue;
        mat3 P = {
          { p0->normal[0], p0->normal[1], p0->normal[2] },
          { p1->normal[0], p1->normal[1], p1->normal[2] },
          { p2->normal[0], p2->normal[1], p2->normal[2] }
        };
        float det = mat3_determinant(P);
        if (det == 0.0f)
          continue;
        vec3 b = { p0->distance, p1->distance, p2->distance };
        // P * v = -b
        // v = -inverse(P) * b
        mat3 inv_P;
        mat3_inverse(inv_P, P);
        vec3 v;
        mat3_vec3_mul(v, inv_P, b);
        bool invalid = false;
        for (size_t m = 0; m < plane_count; ++m) {
          float d = vec3_mul_inner(brush->planes[m].normal, v) - brush->planes[m].distance;
          if (d > 0.008f)
          {
            invalid = true;
            break;
          }
        }
        if (!invalid && !polygon_has_pt(&polygon, v)) {
          buf_grow(polygon.points, 1);
          buf_set_size(polygon.points, buf_size(polygon.points) + 1);
          memcpy(polygon.points[buf_size(polygon.points) - 1], v, sizeof(vec3));
        }
      }
    }
    if (buf_size(polygon.points) >= 3) {
      buf_push(polygons, polygon);
    } else {
      buf_free(polygon.indices);
      buf_free(polygon.points);
    }
  }
  *polygons_out = polygons;
  return true;
}
void write_brushes(FILE *fp, dmodel_t *model, vec3 origin) {
  for (size_t i = 0; i < model->numBrushes; ++i) {
    fprintf(fp, "{\n");
    MapBrush *brush = &mapbrushes[model->firstBrush + i];
    // for (size_t j = 0; j < buf_size(brush->planes); ++j)
    // {
    //   MapPlane *plane = &brush->planes[j];
    //   write_plane(fp, plane->material, plane->normal, plane->distance);
    // }
    Polygon *polys = NULL;
    polygonize_brush(brush, &polys);
    for (size_t j = 0; j < buf_size(polys); ++j) {
      Polygon *poly = &polys[j];
      MapPlane *plane = poly->plane;
      write_plane(fp, plane->material, plane->normal, plane->distance, origin);
    }
    fprintf(fp, "}\n");  
  }
}
void export_to_map(ProgramOptions *opts, const char *path) {
  FILE *mapfile = NULL;
  mapfile = fopen(path, "w");
  if (!mapfile) {
    printf("Failed to open '%s'\n", path);
    return;
  }
  printf("Exporting to '%s'\n", path);
  Entity *worldspawn = &entities[0];
  fprintf(mapfile, "iwmap 4\n");
  fprintf(mapfile, "// entity 0\n{\n");
  for (size_t i = 0; i < buf_size(worldspawn->keyvalues); ++i) {
    KeyValuePair *kvp = &worldspawn->keyvalues[i];
    fprintf(mapfile, "\"%s\" \"%s\"\n", kvp->key, kvp->value);
  }
  dmodel_t *models = lumpdata[LUMP_MODELS].data;
  write_brushes(mapfile, &models[0], (vec3) { 0.f, 0.f, 0.f });
  if (!opts->exclude_patches) {
    write_patches(mapfile);
  }
  fprintf(mapfile, "}\n");
  for (size_t i = 1; i < buf_size(entities); ++i) {
    Entity *e = &entities[i];
    const char *classname = entity_key_by_value(e, "classname");
    fprintf(mapfile, "// entity %d\n{\n", i);
    bool has_brushes = !strcmp(classname, "script_brushmodel") || strstr(classname, "trigger_");
    for (size_t j = 0; j < buf_size(e->keyvalues); ++j) {
      KeyValuePair *kvp = &e->keyvalues[j];
      if (has_brushes) {
        if (!strcmp(kvp->key, "origin") || !strcmp(kvp->key, "model"))
          continue;
      }
      fprintf(mapfile, "\"%s\" \"%s\"\n", kvp->key, kvp->value);
    }
    if (has_brushes) {
      const char *modelstr = entity_key_by_value(e, "model");
      vec3 origin = {0};
      const char *originstr = entity_key_by_value(e, "origin");
      if (originstr) {
        sscanf(originstr, "%f %f %f", &origin[0], &origin[1], &origin[2]);
      }
      int modelidx = 0;
      sscanf(modelstr, "*%d", &modelidx);
      write_brushes(mapfile, &models[modelidx], origin);
    }
    fprintf(mapfile, "}\n");
  }
  fclose(mapfile);
}
void print_info(dheader_t *hdr, const char *path) {
  printf("bsp.c v0.1 (c) 2024\n");
  printf("---------------------\n");
  printf("%s: %d\n", path, filelen);
  info(hdr, LUMP_MODELS, NULL);
  info(hdr, LUMP_MATERIALS, NULL);
  info(hdr, LUMP_BRUSHES, NULL);
  info(hdr, LUMP_BRUSHSIDES, NULL);
  info(hdr, LUMP_PLANES, NULL);
  int entity_count = buf_size(entities);
  info(hdr, LUMP_ENTITIES, &entity_count);
  printf("\n");
  info(hdr, LUMP_NODES, NULL);
  info(hdr, LUMP_LEAFS, NULL);
  info(hdr, LUMP_LEAFBRUSHES, NULL);
  info(hdr, LUMP_LEAFSURFACES, NULL);
  info(hdr, LUMP_COLLISIONVERTS, NULL);
  info(hdr, LUMP_COLLISIONEDGES, NULL);
  info(hdr, LUMP_COLLISIONTRIS, NULL);
  info(hdr, LUMP_COLLISIONBORDERS, NULL);
  info(hdr, LUMP_COLLISIONAABBS, NULL);
  info(hdr, LUMP_DRAWVERTS, NULL);
  info(hdr, LUMP_DRAWINDICES, NULL);
  info(hdr, LUMP_TRIANGLES, NULL);
  info(hdr, LUMP_OBSOLETE_1, NULL);
  info(hdr, LUMP_OBSOLETE_2, NULL);
  info(hdr, LUMP_OBSOLETE_3, NULL);
  info(hdr, LUMP_OBSOLETE_4, NULL);
  info(hdr, LUMP_OBSOLETE_5, NULL);
  info(hdr, LUMP_LIGHTBYTES, NULL);
  info(hdr, LUMP_LIGHTGRIDENTRIES, NULL);
  info(hdr, LUMP_LIGHTGRIDCOLORS, NULL);
  // Not sure if it's stored as a lump or just parsed from entdata with classname "light"
  size_t light_entity_count = 0;
  for (size_t i = 0; i < buf_size(entities); ++i) {
    Entity *e = &entities[i];
    const char *classname = entity_key_by_value(e, "classname");
    if (!strcmp(classname, "light"))
      ++light_entity_count;
  }
  printf("     %d lights                   0 B      0 KB   0.0%\n", light_entity_count);
  info(hdr, LUMP_VISIBILITY, NULL);
  info(hdr, LUMP_PORTALVERTS, NULL);
  info(hdr, LUMP_OCCLUDERS, NULL);
  info(hdr, LUMP_OCCLUDERPLANES, NULL);
  info(hdr, LUMP_OCCLUDEREDGES, NULL);
  info(hdr, LUMP_OCCLUDERINDICES, NULL);
  info(hdr, LUMP_AABBTREES, NULL);
  info(hdr, LUMP_CELLS, NULL);
  info(hdr, LUMP_PORTALS, NULL);
  info(hdr, LUMP_CULLGROUPS, NULL);
  info(hdr, LUMP_CULLGROUPINDICES, NULL);
  printf("\n");
  info(hdr, LUMP_PATHCONNECTIONS, NULL);
  printf("---------------------\n");
}
void print_usage() {
  printf("Usage: ./bsp [options] <input_file>\n");
  printf("\n");
  printf("Options:\n");
  printf("  -info                   Print information about the input file.\n");
  printf("  -export                Export the input file to a .MAP.\n");
  printf("                          If no export path is provided, it will write to the input file with _exported appended.\n");
  printf("                          Example: /path/to/your/bsp.d3dbsp will write to /path/to/your/bsp_exported.map\n");
  printf("  -original_brush_portals   By default portals are converted to brushes instead of using the portals that are in brushes.\n");
  printf("  -exclude_patches       Don't export patches.\n");
  printf("\n");
  printf("\n");
  printf("  -export_path <path>   Specify the path where the export should be saved. Requires an argument.\n");
  printf("  -help                Display this help message and exit.\n");
  printf("\n");
  printf("Arguments:\n");
  printf("  <input_file>         The input file to be processed.\n");
  printf("\n");
  printf("Examples:\n");
  printf("./bsp -info input_file.d3dbsp\n");
  printf("./bsp -export -export_path /path/to/exported_file.map input_file.d3dbsp\n");
  exit(0);
}
bool parse_arguments(int argc, char **argv, ProgramOptions *opts) {
  opts->try_fix_portals = true;
  for (int i = 1; i < argc; i++) {
    switch(argv[i][0]) {
      case '-':
        if (!strcmp(argv[i], "-info")) {
          opts->print_info = true;
        } else if (!strcmp(argv[i], "-help") || !strcmp(argv[i], "-?") || !strcmp(argv[i], "-usage")) {
          print_usage();
        } else if (!strcmp(argv[i], "-exclude_patches")) {
          opts->exclude_patches = true;
        } else if (!strcmp(argv[i], "-original_brush_portals")) {
          opts->try_fix_portals = false;
        } else if (!strcmp(argv[i], "-export")) {
          opts->export_to_map = true;
        } else if (!strcmp(argv[i], "-export_path")) {
          if (i + 1 < argc) {
            opts->export_file = argv[++i];
          } else {
            fprintf(stderr, "Error: -export_path requires a argument.\n");
            return false;
          }
        } else if (!strcmp(argv[i], "-format")) {
          if (i + 1 < argc) {
            opts->format = argv[++i];
          } else {
            fprintf(stderr, "Error: -format requires a argument.\n");
            return false;
          }
        } else {
          fprintf(stderr, "Unknown option: %s\n", argv[i]);
          return false;
        }
      break;
      default:
        // printf("%s\n", argv[i]);
        opts->input_file = argv[i];
      break;
    }
    }
  return true;
}
void pathinfo(
  const char *path,
  char *directory, size_t directory_max_length,
  char *basename, size_t basename_max_length,
  char *extension, size_t extension_max_length, char *sep
) {
  size_t offset = 0;
  const char *it = path;
  while (*it) {
    if (*it == '/' || *it == '\\') {
      if (sep)
        *sep = *it;
      offset = it - path;
    }
    ++it;
  }
  directory[0] = 0;
  snprintf(directory, directory_max_length, "%.*s", offset, path);
  const char *filename = path + offset;
  if (*filename == '/' || *filename == '\\')
    ++filename;
  char *delim = strrchr(filename, '.');
  basename[0] = 0;
  extension[0] = 0;
  if (!delim) {
    snprintf(basename, basename_max_length, "%s", filename);
  } else {
    snprintf(basename, basename_max_length, "%.*s", delim - filename, filename);
    snprintf(extension, extension_max_length, "%s", delim + 1);
  }
}
int main(int argc, char **argv) {
  ProgramOptions opts = {0};
  if (!parse_arguments(argc, argv, &opts)) {
    return 1;
  }
  TEST(dmodel_t, 48);
  Stream s = {0};
  assert(0 == stream_open_file(&s, opts.input_file, "rb"));
  s.seek(&s, 0, SEEK_END);
  filelen = s.tell(&s);
  s.seek(&s, 0, SEEK_SET);
  dheader_t hdr = { 0 };
  stream_read(s, hdr);
  if (memcmp(hdr.ident, "IBSP", 4)) {
    fprintf(stderr, "Magic mismatch");
    exit(1);
  }
  if (hdr.version != 4) {
    fprintf(stderr, "Version mismatch");
    exit(1);
  }
  for (size_t i = 0; i < LUMP_MAX; ++i) {
    lump_t *l = &hdr.lumps[i];
    if (l->filelen != 0 && lumpsizes[i] != 0) {
      LumpData *ld = &lumpdata[i];
      assert(l->filelen % lumpsizes[i] == 0);
      ld->count = l->filelen / lumpsizes[i];
      ld->data = calloc(ld->count, lumpsizes[i]);
      s.seek(&s, l->fileofs, SEEK_SET);
      s.read(&s, ld->data, lumpsizes[i], ld->count);
    }
  }
  entities = parse_entities();
  load_map_brushes();
  if (opts.print_info)
    print_info(&hdr, opts.input_file);
  if (opts.export_to_map) {
    char directory[256] = {0};
    char basename[256] = {0};
    char extension[256] = {0};
    char sep = 0;
    pathinfo(opts.input_file,
         directory,
         sizeof(directory),
         basename,
         sizeof(basename),
         extension,
         sizeof(extension),
         &sep);
    char output_file[256] = {0};
    snprintf(output_file, sizeof(output_file), "%s%c%s_exported.map", directory, sep, basename);
    if (opts.export_file)
      export_to_map(&opts, opts.export_file);
    else
      export_to_map(&opts, output_file);
  }
  return 0;
}
