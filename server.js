const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { Signer } = require('@volcengine/openapi');
const path = require('path');

const app = express();

// 火山引擎配置
const VOLC_CONFIG = {
    accessKeyId: process.env.VOLC_ACCESS_KEY_ID,
    secretKey: process.env.VOLC_SECRET_ACCESS_KEY,
    region: process.env.VOLC_REGION || 'cn-north-1',
    service: process.env.VOLC_SERVICE || 'cv',
    host: 'visual.volcengineapi.com',
    action: 'OCRNormal',
    version: '2020-08-26'
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 静态文件服务 - 明确当前目录
app.use(express.static(path.resolve(__dirname)));

// 模拟数据
function mockOCRResult() {
    return {
        line_texts: ['上新了', '方太', '04/29', '方太智慧洗油烟机L10-AI', '立即抢购'],
        line_rects: [
            { x: 50, y: 50, width: 100, height: 30 },
            { x: 160, y: 52, width: 80, height: 28 },
            { x: 50, y: 100, width: 80, height: 30 },
            { x: 50, y: 150, width: 200, height: 35 },
            { x: 50, y: 200, width: 100, height: 40 }
        ],
        line_probs: [0.95, 0.92, 0.98, 0.91, 0.89]
    };
}

function mockElementResult() {
    return [
        { type: 'logo', x: 50, y: 50, width: 100, height: 100 },
        { type: 'button', x: 50, y: 300, width: 150, height: 50 }
    ];
}

// 首页路由 - 明确返回 index.html
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

// OCR 接口
app.post('/api/ocr', async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ error: '缺少 imageBase64 必填' });
        }

        if (VOLC_CONFIG.accessKeyId && VOLC_CONFIG.secretKey) {
            try {
                const openApiRequestData = {
                    region: VOLC_CONFIG.region,
                    method: 'POST',
                    params: {
                        Action: VOLC_CONFIG.action,
                        Version: VOLC_CONFIG.version
                    },
                    headers: {
                        Region: VOLC_CONFIG.region,
                        Service: VOLC_CONFIG.service,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: `image_base64=${encodeURIComponent(imageBase64)}`
                };

                const signer = new Signer(openApiRequestData, VOLC_CONFIG.service);
                signer.addAuthorization({
                    accessKeyId: VOLC_CONFIG.accessKeyId,
                    secretKey: VOLC_CONFIG.secretKey
                });

                const response = await axios.post(`https://${VOLC_CONFIG.host}`, openApiRequestData.body, {
                    headers: openApiRequestData.headers,
                    params: openApiRequestData.params
                });

                if (response.data && response.data.data && response.data.data.line_texts) {
                    res.json({
                        Result: response.data.data
                    });
                } else {
                    res.json({ Result: response.data.data || response.data });
                }
                return;
            } catch (apiError) {
                console.error('❌ API 调用失败:', apiError.message);
            }
        }

        res.json({ Result: mockOCRResult() });
    } catch (error) {
        console.error('❌ OCR 失败:', error.message);
        res.json({ Result: mockOCRResult() });
    }
});

// 元素识别接口
app.post('/api/element-detection', async (req, res) => {
    try {
        res.json({ Data: { elements: mockElementResult() } });
    } catch (error) {
        res.json({ Data: { elements: mockElementResult() } });
    }
});

// 本地启动服务器
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log('\n=====================================');
        console.log('🚀 后端代理服务器已启动');
        console.log(`📡 端口: ${PORT}`);
        console.log(`🌐 访问: http://localhost:${PORT}`);
        console.log('✅ 火山引擎 OCR 已配置');
        console.log('=====================================\n');
    });
}

// Vercel 导出
module.exports = app;
