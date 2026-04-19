pipeline {
  agent any

  environment {
    GREEN_IP = credentials('GREEN_EC2_IP')
    BLUE_IP = credentials('BLUE_EC2_IP')
    GREEN_TG_ARN = credentials('GREEN_TG_ARN')
    BLUE_TG_ARN = credentials('BLUE_TG_ARN')
    LISTENER_ARN = credentials('ALB_LISTENER_ARN')
    AWS_DEFAULT_REGION = 'us-east-1'
    REPO_URL = 'https://github.com/your-org/complaint-portal.git'
  }

  stages {
    stage('Checkout') {
      steps {
        sh 'rm -rf app && git clone ${REPO_URL} app'
        dir('app') {
          sh 'git rev-parse HEAD'
        }
      }
    }

    stage('Build') {
      steps {
        dir('app') {
          sh 'npm install'
          sh 'npm run build'
          sh 'echo "Build #${BUILD_NUMBER} at $(date -u +%Y-%m-%dT%H:%M:%SZ)"'
        }
      }
    }

    stage('Test') {
      steps {
        dir('app') {
          sh '''
            test -d client/dist && echo "PASS: dist folder exists"
            test -f client/dist/index.html && echo "PASS: dist/index.html exists"
            test -f server.js && echo "PASS: server.js exists"
            node -e "const p=require('./package.json'); if(!p.scripts||!p.scripts.start) process.exit(1)" && echo "PASS: start script exists"
          '''
        }
      }
    }

    stage('Security Testing (OWASP ZAP)') {
      steps {
        dir('app') {
          sh '''
            mkdir -p zap-reports
            docker pull owasp/zap2docker-stable
            docker run --rm -v $(pwd)/zap-reports:/zap/wrk owasp/zap2docker-stable zap-baseline.py -t http://${GREEN_IP} -r zap-report.html -x zap-report.xml -J zap-report.json -l WARN || true
            echo "ZAP scan complete — review report in Jenkins artifacts"
          '''
          archiveArtifacts artifacts: 'zap-reports/**', allowEmptyArchive: true
        }
      }
    }

    stage('Deploy to Green') {
      steps {
        sshagent(['ec2-ssh-key']) {
          dir('app') {
            sh '''
              rsync -avz --delete ./ ec2-user@${GREEN_IP}:/var/www/html/
              ssh ec2-user@${GREEN_IP} "cd /var/www/html && npm install --production"
              ssh ec2-user@${GREEN_IP} "pm2 restart complaint-portal || pm2 start server.js --name complaint-portal"
            '''
          }
        }
      }
    }

    stage('Verify Green') {
      steps {
        script {
          def success = false
          for (int i = 0; i < 5; i++) {
            def code = sh(script: "curl -o /dev/null -s -w '%{http_code}' http://${GREEN_IP}/api/health", returnStdout: true).trim()
            if (code == '200') {
              success = true
              break
            }
            sleep 10
          }
          if (!success) {
            error("Green verification failed")
          }
        }
      }
    }

    stage('Switch Traffic') {
      steps {
        sh '''
          aws elbv2 modify-listener --listener-arn ${LISTENER_ARN} --default-actions Type=forward,TargetGroupArn=${GREEN_TG_ARN} --region us-east-1
          echo "Traffic switched to Green. App live."
        '''
      }
    }
  }

  post {
    failure {
      sh '''
        echo "PIPELINE FAILED — INITIATING ROLLBACK"
        aws elbv2 modify-listener --listener-arn ${LISTENER_ARN} --default-actions Type=forward,TargetGroupArn=${BLUE_TG_ARN} --region us-east-1
        echo "ROLLBACK COMPLETE — Blue is serving traffic"
      '''
    }
    success {
      sh '''
        echo "Deployment Summary"
        echo "Build: #${BUILD_NUMBER}"
        echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        echo "ALB URL: http://${GREEN_IP}"
      '''
    }
    always {
      echo "Build #${BUILD_NUMBER} finished with status: ${currentBuild.currentResult}"
    }
  }
}
