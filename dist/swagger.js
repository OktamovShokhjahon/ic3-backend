"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
exports.swaggerSpec = (0, swagger_jsdoc_1.default)({
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Secure Multi-Level Test Platform API',
            version: '1.0.0'
        },
        servers: [
            {
                url: '/api',
                description: 'API base'
            }
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'token'
                },
                deviceHeader: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-device-id'
                }
            }
        },
        security: [{ cookieAuth: [], deviceHeader: [] }],
        tags: [
            { name: 'Auth' },
            { name: 'Admin' },
            { name: 'Tests' }
        ],
        paths: {
            '/auth/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'Login',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['username', 'password'],
                                    properties: {
                                        username: { type: 'string' },
                                        password: { type: 'string' },
                                        deviceId: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: { description: 'Login successful' },
                        401: { description: 'Invalid credentials / disabled' },
                        403: { description: 'Device mismatch' }
                    }
                }
            },
            '/auth/logout': {
                post: {
                    tags: ['Auth'],
                    summary: 'Logout',
                    responses: { 200: { description: 'Logged out' } }
                }
            },
            '/auth/me': {
                get: {
                    tags: ['Auth'],
                    summary: 'Get current user',
                    responses: { 200: { description: 'Current user' }, 401: { description: 'Unauthenticated' } }
                }
            },
            '/admin/users': {
                get: {
                    tags: ['Admin'],
                    summary: 'List users (admin)',
                    responses: { 200: { description: 'Users' }, 403: { description: 'Admin required' } }
                },
                post: {
                    tags: ['Admin'],
                    summary: 'Create user (admin)',
                    responses: { 201: { description: 'Created' }, 400: { description: 'Validation error' } }
                }
            },
            '/admin/users/{id}': {
                put: {
                    tags: ['Admin'],
                    summary: 'Update user (admin)',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Updated' }, 404: { description: 'Not found' } }
                },
                delete: {
                    tags: ['Admin'],
                    summary: 'Delete user (admin)',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Deleted' }, 404: { description: 'Not found' } }
                }
            },
            '/admin/users/{id}/reset-device': {
                post: {
                    tags: ['Admin'],
                    summary: 'Reset device session (admin)',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Reset' }, 404: { description: 'Not found' } }
                }
            },
            '/admin/stats': {
                get: {
                    tags: ['Admin'],
                    summary: 'Platform statistics (admin)',
                    responses: { 200: { description: 'Stats' } }
                }
            },
            '/tests/questions/{level}/{type}': {
                get: {
                    tags: ['Tests'],
                    summary: 'Get randomized questions (no answers)',
                    parameters: [
                        { name: 'level', in: 'path', required: true, schema: { type: 'string', enum: ['1', '2', '3'] } },
                        { name: 'type', in: 'path', required: true, schema: { type: 'string', enum: ['1-45', '46-90', 'full'] } }
                    ],
                    responses: { 200: { description: 'Questions' }, 403: { description: 'Level locked' } }
                }
            },
            '/tests/submit': {
                post: {
                    tags: ['Tests'],
                    summary: 'Submit test answers',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['level', 'type', 'questionIds', 'answers', 'timeSpent'],
                                    properties: {
                                        level: { type: 'number', enum: [1, 2, 3] },
                                        type: { type: 'string', enum: ['1-45', '46-90', 'full'] },
                                        questionIds: { type: 'array', items: { type: 'string' } },
                                        answers: { type: 'array', items: { type: 'number' } },
                                        timeSpent: { type: 'number' }
                                    }
                                }
                            }
                        }
                    },
                    responses: { 200: { description: 'Result' } }
                }
            },
            '/tests/results': {
                get: { tags: ['Tests'], summary: 'User results', responses: { 200: { description: 'Results' } } }
            },
            '/tests/stats': {
                get: { tags: ['Tests'], summary: 'User stats', responses: { 200: { description: 'Stats' } } }
            }
        }
    },
    apis: []
});
//# sourceMappingURL=swagger.js.map