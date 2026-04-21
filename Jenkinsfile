pipeline {
    agent any

    environment {
        // Required for Deployment
        RENDER_DEPLOY_HOOK = credentials('RENDER_DEPLOY_HOOK')
        CLOUDFLARE_API_TOKEN = credentials('CLOUDFLARE_API_TOKEN')
        CLOUDFLARE_ACCOUNT_ID = credentials('CLOUDFLARE_ACCOUNT_ID')
        
        // Project Specifics
        CF_PROJECT_NAME = "complain-72e"
        APP_URL_PROD = "https://${CF_PROJECT_NAME}.pages.dev"
        REPO_URL = "https://github.com/Kashchit/complain_portal.git"
    }

    stages {
        stage('Checkout SCM') {
            steps {
                checkout scm
            }
        }

        stage('🚀 Setup & Checkout') {
            steps {
                sh 'npm install'
                dir('client') {
                    sh 'npm install'
                }
            }
        }

        stage('🔍 Security Audit') {
            steps {
                sh 'npm audit --audit-level=high || true'
                dir('client') {
                    sh 'npm audit --audit-level=high || true'
                }
            }
        }

        stage('📦 Build Project') {
            steps {
                sh 'npm run build'
            }
        }

        stage('🌐 Deploy to...') {
            parallel {
                stage('Deploy Backend (Render)') {
                    steps {
                        sh 'curl -X POST "${RENDER_DEPLOY_HOOK}"'
                        echo "Backend deployment triggered on Render"
                    }
                }
                stage('Deploy Frontend (Cloudflare)') {
                    steps {
                        // Using npx wrangler to deploy the build folder
                        // Added --commit-dirty=true to silence the git warning that can cause failures in some CI environments
                        sh "npx wrangler pages deploy client/dist --project-name ${CF_PROJECT_NAME} --branch main --commit-dirty=true"
                    }
                }
            }
        }

        stage('🛡️ Security Scan (OWASP ZAP)') {
            steps {
                script {
                    sh 'mkdir -p zap-reports'
                    // Run ZAP Baseline scan against the production frontend URL
                    sh "docker run --rm -v \$(pwd)/zap-reports:/zap/wrk owasp/zap2docker-stable zap-baseline.py -t ${APP_URL_PROD} -r zap-report.html -l WARN || true"
                }
            }
        }
    }

    post {
        always {
            script {
                echo "Build #${BUILD_NUMBER} finished with status: ${currentBuild.currentResult}"
                archiveArtifacts artifacts: 'zap-reports/zap-report.html', allowEmptyArchive: true
            }
        }
        success {
            echo "✅ Deployment successful!"
            echo "Full Stack Live at: ${APP_URL_PROD}"
        }
        failure {
            echo "❌ Pipeline failed. Review the logs for errors."
        }
    }
}

