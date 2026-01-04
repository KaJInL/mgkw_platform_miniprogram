/**
 * GLB Loader for WeChat MiniProgram
 * 专门用于小程序环境加载 GLB 格式的 3D 模型
 */

export class GLBLoader {
    constructor(THREE, canvas = null) {
        this.THREE = THREE
        this.canvas = canvas
        this.checkCompatibility()
    }

    /**
     * 检查 Three.js 兼容性
     */
    checkCompatibility() {
        const THREE = this.THREE

        // 检查 BufferGeometry
        if (!THREE.BufferGeometry) {
            throw new Error('THREE.BufferGeometry 不可用')
        }

        // 检查 BufferAttribute
        if (!THREE.BufferAttribute) {
            throw new Error('THREE.BufferAttribute 不可用')
        }

        // 测试 API 版本
        const testGeometry = new THREE.BufferGeometry()
        if (testGeometry.addAttribute) {
            this.useOldAPI = true
        } else if (testGeometry.setAttribute) {
            this.useOldAPI = false
        } else {
            throw new Error('无法确定 Three.js API 版本')
        }
    }

    /**
     * 加载 GLB 文件
     * @param {string} url - GLB 文件 URL
     * @returns {Promise<Object>} 返回 Three.js Group 对象
     */
    async load(url) {

        // 1. 下载 GLB 文件
        const arrayBuffer = await this.downloadFile(url)

        // 2. 解析 GLB 二进制格式
        const glbData = this.parseGLB(arrayBuffer)

        // 3. 根据 GLTF JSON 创建 Three.js 对象
        const scene = await this.buildScene(glbData)

        return scene
    }

    /**
     * 下载文件
     */
    downloadFile(url) {
        return new Promise((resolve, reject) => {
            uni.request({
                url: url,
                method: 'GET',
                responseType: 'arraybuffer',
                timeout: 30000,
                success: (res) => {
                    if (res.statusCode === 200) {
                        resolve(res.data)
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}`))
                    }
                },
                fail: (err) => {
                    reject(new Error(err.errMsg || '网络请求失败'))
                }
            })
        })
    }

    /**
     * 解析 GLB 文件格式
     * GLB 格式：Header + JSON Chunk + Binary Chunk
     */
    parseGLB(arrayBuffer) {
        const dataView = new DataView(arrayBuffer)
        let offset = 0

        // 读取 Header (12 bytes)
        const magic = dataView.getUint32(offset, true)
        offset += 4

        if (magic !== 0x46546C67) { // 'glTF' in ASCII
            throw new Error('不是有效的 GLB 文件')
        }

        const version = dataView.getUint32(offset, true)
        offset += 4

        const length = dataView.getUint32(offset, true)
        offset += 4


        // 读取 JSON Chunk
        const jsonChunkLength = dataView.getUint32(offset, true)
        offset += 4

        const jsonChunkType = dataView.getUint32(offset, true)
        offset += 4

        if (jsonChunkType !== 0x4E4F534A) { // 'JSON'
            throw new Error('GLB 文件格式错误：缺少 JSON chunk')
        }

        const jsonBytes = new Uint8Array(arrayBuffer, offset, jsonChunkLength)
        const jsonString = this.decodeUTF8(jsonBytes)
        const gltf = JSON.parse(jsonString)
        offset += jsonChunkLength

        // 读取 Binary Chunk（如果存在）
        let binaryBuffer = null
        if (offset < arrayBuffer.byteLength) {
            const binaryChunkLength = dataView.getUint32(offset, true)
            offset += 4

            const binaryChunkType = dataView.getUint32(offset, true)
            offset += 4

            if (binaryChunkType === 0x004E4942) { // 'BIN\0'
                binaryBuffer = arrayBuffer.slice(offset, offset + binaryChunkLength)
            }
        }

        return {
            json: gltf,
            binaryBuffer: binaryBuffer
        }
    }

    /**
     * UTF-8 解码
     */
    decodeUTF8(bytes) {
        let result = ''
        let i = 0

        while (i < bytes.length) {
            const c = bytes[i]

            if (c < 128) {
                result += String.fromCharCode(c)
                i++
            } else if (c < 224) {
                result += String.fromCharCode(((c & 31) << 6) | (bytes[i + 1] & 63))
                i += 2
            } else if (c < 240) {
                result += String.fromCharCode(((c & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63))
                i += 3
            } else {
                i += 4
            }
        }

        return result
    }

    /**
     * 构建 Three.js 场景
     */
    async buildScene(glbData) {
        const {json, binaryBuffer} = glbData
        const THREE = this.THREE

        const group = new THREE.Group()
        group.name = 'GLBModel'

        // 解析纹理
        const textures = await this.parseTextures(json, binaryBuffer)

        // 解析材质
        const materials = this.parseMaterials(json, textures)

        // 解析网格
        const meshes = this.parseMeshes(json, binaryBuffer, materials)

        // 构建场景树
        if (json.scenes && json.scenes.length > 0) {
            const sceneData = json.scenes[0]
            if (sceneData.nodes) {
                for (const nodeIndex of sceneData.nodes) {
                    const node = this.buildNode(json, nodeIndex, meshes)
                    if (node) group.add(node)
                }
            }
        }

        return group
    }

    /**
     * 解析纹理（等待所有纹理加载完成）
     */
    async parseTextures(gltf, binaryBuffer) {
        const THREE = this.THREE
        const textures = []

        if (!gltf.textures || gltf.textures.length === 0) {
            return textures
        }


        // 创建所有纹理加载的 Promise
        const texturePromises = []

        for (let i = 0; i < gltf.textures.length; i++) {
            const textureDef = gltf.textures[i]
            const texturePromise = new Promise((resolve) => {
                try {
                    if (textureDef.source !== undefined) {
                        const imageIndex = textureDef.source
                        const image = gltf.images[imageIndex]

                        if (image && image.bufferView !== undefined) {
                            // 从 bufferView 读取图像数据
                            const bufferView = gltf.bufferViews[image.bufferView]
                            const offset = bufferView.byteOffset || 0
                            const length = bufferView.byteLength

                            const imageData = new Uint8Array(binaryBuffer, offset, length)

                            // 创建 base64 图像
                            const base64 = this.arrayBufferToBase64(imageData)
                            const mimeType = image.mimeType || 'image/png'
                            const dataUrl = `data:${mimeType};base64,${base64}`

                            // 创建 Three.js 纹理
                            const texture = new THREE.Texture()

                            // 设置纹理过滤和重复模式
                            texture.minFilter = THREE.LinearMipMapLinearFilter
                            texture.magFilter = THREE.LinearFilter
                            texture.wrapS = THREE.RepeatWrapping
                            texture.wrapT = THREE.RepeatWrapping
                            texture.anisotropy = 16 // 各向异性过滤，提高纹理质量
                            texture.encoding = THREE.sRGBEncoding // 正确的颜色空间

                            if (this.canvas && this.canvas.createImage) {
                                const img = this.canvas.createImage()

                                img.onload = () => {
                                    texture.image = img
                                    texture.needsUpdate = true
                                    resolve(texture)
                                }

                                img.onerror = (err) => {
                                    console.error(`[GLBLoader] 纹理 ${i} 加载失败:`, err)
                                    resolve(null)
                                }

                                img.src = dataUrl
                            } else {
                                console.warn(`[GLBLoader] Canvas 不可用，跳过纹理 ${i}`)
                                resolve(null)
                            }
                        } else if (image && image.uri) {
                            // 外部图片 URI
                            console.warn('[GLBLoader] 暂不支持外部纹理 URI:', image.uri)
                            resolve(null)
                        } else {
                            resolve(null)
                        }
                    } else {
                        resolve(null)
                    }
                } catch (error) {
                    console.error(`[GLBLoader] 解析纹理 ${i} 失败:`, error)
                    resolve(null)
                }
            })

            texturePromises.push(texturePromise)
        }

        // 等待所有纹理加载完成
        return await Promise.all(texturePromises)
    }

    /**
     * 将 ArrayBuffer 转换为 Base64
     */
    arrayBufferToBase64(buffer) {
        let binary = ''
        const bytes = new Uint8Array(buffer)
        const len = bytes.byteLength
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i])
        }

        // 使用小程序的 API 转换 base64
        // @ts-ignore
        if (typeof wx !== 'undefined' && wx.arrayBufferToBase64) {
            return wx.arrayBufferToBase64(buffer)
        }

        // 回退方案：手动转换
        return btoa(binary)
    }

    /**
     * 解析材质
     */
    parseMaterials(gltf, textures = []) {
        const THREE = this.THREE
        const materials = []

        if (!gltf.materials || gltf.materials.length === 0) {
            // 默认材质
            materials.push(new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                side: THREE.DoubleSide
            }))
            return materials
        }


        for (let i = 0; i < gltf.materials.length; i++) {
            const matDef = gltf.materials[i]
            const material = new THREE.MeshStandardMaterial({
                name: matDef.name || `Material_${i}`,
                side: THREE.DoubleSide,
                // 启用平滑着色
                flatShading: false,
                // 提高材质质量
                envMapIntensity: 1.0,
                // 确保材质正确更新
                needsUpdate: true
            })


            // PBR 材质参数
            if (matDef.pbrMetallicRoughness) {
                const pbr = matDef.pbrMetallicRoughness

                // 基础颜色
                if (pbr.baseColorFactor) {
                    material.color.setRGB(
                        pbr.baseColorFactor[0],
                        pbr.baseColorFactor[1],
                        pbr.baseColorFactor[2]
                    )
                    if (pbr.baseColorFactor[3] < 1.0) {
                        material.opacity = pbr.baseColorFactor[3]
                        material.transparent = true
                    }
                }

                // 基础颜色纹理
                if (pbr.baseColorTexture && textures.length > 0) {
                    const textureInfo = pbr.baseColorTexture
                    const textureIndex = textureInfo.index
                    if (textureIndex !== undefined && textures[textureIndex]) {
                        material.map = textures[textureIndex]
                        material.map.encoding = THREE.sRGBEncoding
                        material.map.flipY = false // GLTF 纹理不需要翻转

                        // 纹理坐标集（如果使用 TEXCOORD_1，需要特殊处理）
                        if (textureInfo.texCoord !== undefined && textureInfo.texCoord === 1) {
                            // 注意：这里需要确保几何体有 uv2 属性
                        }


                        // 如果有纹理，确保颜色是白色（让纹理完全显示）
                        if (!pbr.baseColorFactor || pbr.baseColorFactor[0] === 1 && pbr.baseColorFactor[1] === 1 && pbr.baseColorFactor[2] === 1) {
                            material.color.setRGB(1, 1, 1)
                        }
                    } else {
                        console.warn(`  - 颜色纹理 ${textureIndex} 未加载`)
                    }
                }

                // 金属度
                if (pbr.metallicFactor !== undefined) {
                    material.metalness = pbr.metallicFactor
                }

                // 粗糙度
                if (pbr.roughnessFactor !== undefined) {
                    material.roughness = pbr.roughnessFactor
                }

                // 金属粗糙度纹理
                if (pbr.metallicRoughnessTexture && textures.length > 0) {
                    const textureIndex = pbr.metallicRoughnessTexture.index
                    if (textureIndex !== undefined && textures[textureIndex]) {
                        material.metalnessMap = textures[textureIndex]
                        material.roughnessMap = textures[textureIndex]
                    }
                }
            }

            // 法线贴图
            if (matDef.normalTexture && textures.length > 0) {
                const textureInfo = matDef.normalTexture
                const textureIndex = textureInfo.index
                if (textureIndex !== undefined && textures[textureIndex]) {
                    material.normalMap = textures[textureIndex]
                    material.normalMap.flipY = false
                    material.normalScale = new THREE.Vector2(
                        textureInfo.scale !== undefined ? textureInfo.scale : 1,
                        textureInfo.scale !== undefined ? textureInfo.scale : 1
                    )
                }
            }

            // 双面渲染
            if (matDef.doubleSided) {
                material.side = THREE.DoubleSide
            }

            // Alpha 模式
            if (matDef.alphaMode) {
                if (matDef.alphaMode === 'BLEND') {
                    material.transparent = true
                    material.depthWrite = false
                } else if (matDef.alphaMode === 'MASK') {
                    material.alphaTest = matDef.alphaCutoff !== undefined ? matDef.alphaCutoff : 0.5
                }
            }

            // 自发光
            if (matDef.emissiveFactor) {
                material.emissive.setRGB(
                    matDef.emissiveFactor[0],
                    matDef.emissiveFactor[1],
                    matDef.emissiveFactor[2]
                )
            }

            // 自发光纹理
            if (matDef.emissiveTexture && textures.length > 0) {
                const textureIndex = matDef.emissiveTexture.index
                if (textureIndex !== undefined && textures[textureIndex]) {
                    material.emissiveMap = textures[textureIndex]
                }
            }

            // 环境遮蔽纹理
            if (matDef.occlusionTexture && textures.length > 0) {
                const textureIndex = matDef.occlusionTexture.index
                if (textureIndex !== undefined && textures[textureIndex]) {
                    material.aoMap = textures[textureIndex]
                    material.aoMapIntensity = matDef.occlusionTexture.strength !== undefined
                        ? matDef.occlusionTexture.strength
                        : 1.0
                }
            }

            materials.push(material)
        }

        return materials
    }

    /**
     * 解析网格
     */
    parseMeshes(gltf, binaryBuffer, materials) {
        const THREE = this.THREE
        const meshes = []

        if (!gltf.meshes) {
            console.warn('[GLBLoader] 没有找到网格数据')
            return meshes
        }


        for (let i = 0; i < gltf.meshes.length; i++) {
            const meshDef = gltf.meshes[i]
            const group = new THREE.Group()
            group.name = meshDef.name || `Mesh_${i}`


            if (meshDef.primitives) {
                for (let j = 0; j < meshDef.primitives.length; j++) {
                    const primitive = meshDef.primitives[j]
                    try {

                        const geometry = this.parseGeometry(gltf, primitive, binaryBuffer)
                        const materialIndex = primitive.material !== undefined ? primitive.material : 0
                        const material = materials[materialIndex] || materials[0]

                        const mesh = new THREE.Mesh(geometry, material)
                        mesh.castShadow = true
                        mesh.receiveShadow = true
                        mesh.name = `${group.name}_primitive_${j}`

                        group.add(mesh)
                    } catch (e) {
                        console.error(`[GLBLoader] 解析 primitive ${j} 失败:`, e)
                        console.error('[GLBLoader] 错误详情:', e.message, e.stack)
                        // 继续处理其他 primitive
                    }
                }
            }

            if (group.children.length > 0) {
                meshes.push(group)
            } else {
                console.warn(`[GLBLoader] 网格 ${i} 没有有效的几何体`)
            }
        }

        return meshes
    }

    /**
     * 解析几何体
     */
    parseGeometry(gltf, primitive, binaryBuffer) {
        const THREE = this.THREE
        const geometry = new THREE.BufferGeometry()

        const attributes = primitive.attributes

        try {
            // 解析 POSITION（必需）
            if (attributes.POSITION !== undefined) {
                const positionData = this.getAccessorData(gltf, attributes.POSITION, binaryBuffer)

                const positionAttr = new THREE.BufferAttribute(positionData, 3)
                this.addGeometryAttribute(geometry, 'position', positionAttr)
            } else {
                throw new Error('缺少 POSITION 属性')
            }

            // 解析 NORMAL
            if (attributes.NORMAL !== undefined) {
                const normalData = this.getAccessorData(gltf, attributes.NORMAL, binaryBuffer)

                const normalAttr = new THREE.BufferAttribute(normalData, 3)
                this.addGeometryAttribute(geometry, 'normal', normalAttr)
            }

            // 解析 TEXCOORD_0 (UV)
            if (attributes.TEXCOORD_0 !== undefined) {
                const uvData = this.getAccessorData(gltf, attributes.TEXCOORD_0, binaryBuffer)

                const uvAttr = new THREE.BufferAttribute(uvData, 2)
                this.addGeometryAttribute(geometry, 'uv', uvAttr)
            }

            // 解析 TEXCOORD_1 (第二套 UV，用于 AO 等)
            if (attributes.TEXCOORD_1 !== undefined) {
                const uvData = this.getAccessorData(gltf, attributes.TEXCOORD_1, binaryBuffer)

                const uvAttr = new THREE.BufferAttribute(uvData, 2)
                this.addGeometryAttribute(geometry, 'uv2', uvAttr)
            }

            // 解析顶点颜色
            if (attributes.COLOR_0 !== undefined) {
                const colorData = this.getAccessorData(gltf, attributes.COLOR_0, binaryBuffer)

                const colorAttr = new THREE.BufferAttribute(colorData, 4)
                this.addGeometryAttribute(geometry, 'color', colorAttr)
            }

            // 解析索引
            if (primitive.indices !== undefined) {
                const indexData = this.getAccessorData(gltf, primitive.indices, binaryBuffer)

                const indexAttr = new THREE.BufferAttribute(indexData, 1)
                geometry.setIndex(indexAttr)
            }

            // 如果没有法线，自动计算
            if (!attributes.NORMAL) {
                geometry.computeVertexNormals()
            }

            return geometry

        } catch (error) {
            console.error('[GLBLoader] 解析几何体时出错:', error)
            throw error
        }
    }

    /**
     * 获取 Accessor 数据
     */
    getAccessorData(gltf, accessorIndex, binaryBuffer) {
        try {
            const accessor = gltf.accessors[accessorIndex]
            const bufferView = gltf.bufferViews[accessor.bufferView]

            const offset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0)
            const componentCount = this.getComponentCount(accessor.type)
            const length = accessor.count * componentCount


            // 根据 componentType 创建对应的 TypedArray
            const ArrayType = this.getArrayType(accessor.componentType)
            return new ArrayType(binaryBuffer, offset, length)
        } catch (error) {
            console.error('[GLBLoader] 获取 Accessor 数据失败:', error)
            throw error
        }
    }

    /**
     * 添加几何体属性（兼容新旧 API）
     */
    addGeometryAttribute(geometry, name, attribute) {
        if (this.useOldAPI) {
            geometry.addAttribute(name, attribute)
        } else {
            geometry.setAttribute(name, attribute)
        }
    }

    /**
     * 获取组件数量
     */
    getComponentCount(type) {
        switch (type) {
            case 'SCALAR':
                return 1
            case 'VEC2':
                return 2
            case 'VEC3':
                return 3
            case 'VEC4':
                return 4
            case 'MAT2':
                return 4
            case 'MAT3':
                return 9
            case 'MAT4':
                return 16
            default:
                return 1
        }
    }

    /**
     * 获取数组类型
     */
    getArrayType(componentType) {
        switch (componentType) {
            case 5120:
                return Int8Array
            case 5121:
                return Uint8Array
            case 5122:
                return Int16Array
            case 5123:
                return Uint16Array
            case 5125:
                return Uint32Array
            case 5126:
                return Float32Array
            default:
                return Float32Array
        }
    }

    /**
     * 构建节点树
     */
    buildNode(gltf, nodeIndex, meshes) {
        const THREE = this.THREE
        const nodeDef = gltf.nodes[nodeIndex]

        let node

        // 如果节点有 mesh，使用对应的 mesh
        if (nodeDef.mesh !== undefined) {
            node = meshes[nodeDef.mesh].clone()
        } else {
            node = new THREE.Object3D()
        }

        // 设置名称
        if (nodeDef.name) {
            node.name = nodeDef.name
        }

        // 设置变换
        if (nodeDef.matrix) {
            const matrix = new THREE.Matrix4()
            matrix.fromArray(nodeDef.matrix)
            matrix.decompose(node.position, node.quaternion, node.scale)
        } else {
            if (nodeDef.translation) {
                node.position.fromArray(nodeDef.translation)
            }
            if (nodeDef.rotation) {
                node.quaternion.fromArray(nodeDef.rotation)
            }
            if (nodeDef.scale) {
                node.scale.fromArray(nodeDef.scale)
            }
        }

        // 递归添加子节点
        if (nodeDef.children) {
            for (const childIndex of nodeDef.children) {
                const child = this.buildNode(gltf, childIndex, meshes)
                if (child) node.add(child)
            }
        }

        return node
    }
}

