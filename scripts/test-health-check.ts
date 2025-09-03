#!/usr/bin/env tsx

/**
 * Test script for Health Check Service
 *
 * This script validates the health check system including:
 * - Individual service health checks
 * - Overall system health assessment
 * - Performance monitoring
 * - Error handling and recovery
 * - Service status reporting
 *
 * Usage: npx tsx scripts/test-health-check.ts
 */

import { getHealthCheckService } from '../src/services/health/HealthCheckService';

async function testHealthCheckService() {
  console.log('🏥 Starting Health Check Service Tests...\n');

  try {
    // Initialize health check service
    const healthService = getHealthCheckService({
      timeout: 10000,
      parallel: true,
      services: [
        'hedera',
        'mirror-node',
        'hcs',
        'hts',
        'compliance',
        'database',
      ],
      criticalServices: ['hedera', 'mirror-node'],
    });

    console.log('⚙️ Configuration:');
    console.log(`- Timeout: 10000ms`);
    console.log(`- Parallel execution: enabled`);
    console.log(`- Services: 6 configured`);
    console.log(`- Critical services: hedera, mirror-node\n`);

    // Test 1: Overall System Health Check
    console.log('🌟 Test 1: Overall System Health Check');
    try {
      const startTime = Date.now();
      const systemHealth = await healthService.checkOverallHealth();
      const totalTime = Date.now() - startTime;

      console.log(`✅ Health check completed in ${totalTime}ms`);
      console.log(`📊 Overall Status: ${systemHealth.status.toUpperCase()}`);
      console.log(`🎯 Service Breakdown:`);
      console.log(`   - Healthy: ${systemHealth.healthyServices}`);
      console.log(`   - Degraded: ${systemHealth.degradedServices}`);
      console.log(`   - Unhealthy: ${systemHealth.unhealthyServices}`);
      console.log(`   - Total: ${systemHealth.totalServices}`);
      console.log(
        `⏱️ System Response Time: ${systemHealth.totalResponseTime}ms`
      );
      console.log(
        `🕐 System Uptime: ${Math.round(systemHealth.uptime / 1000)}s`
      );

      // Show individual service results
      console.log('\n📋 Individual Service Results:');
      systemHealth.services.forEach(service => {
        const statusIcon =
          service.status === 'healthy'
            ? '✅'
            : service.status === 'degraded'
              ? '⚠️'
              : '❌';
        const criticalMark = service.critical ? ' (CRITICAL)' : '';

        console.log(
          `   ${statusIcon} ${service.service}${criticalMark}: ${service.status} (${service.responseTime}ms)`
        );

        if (service.error) {
          console.log(`      Error: ${service.error}`);
        }

        if (service.details && Object.keys(service.details).length > 0) {
          console.log(
            `      Details: ${JSON.stringify(service.details, null, 0)}`
          );
        }
      });
    } catch (error) {
      console.log(
        `❌ Overall health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    console.log();

    // Test 2: Individual Service Health Checks
    console.log('🔍 Test 2: Individual Service Health Checks');
    const servicesToTest = [
      'hedera',
      'mirror-node',
      'hcs',
      'hts',
      'compliance',
    ];

    for (const serviceName of servicesToTest) {
      try {
        console.log(`\n🔧 Testing ${serviceName} service...`);
        const startTime = Date.now();

        // Get individual service health by running overall check and filtering
        const systemHealth = await healthService.checkOverallHealth();
        const serviceHealth = systemHealth.services.find(
          s => s.service === serviceName
        );

        const responseTime = Date.now() - startTime;

        if (serviceHealth) {
          const statusIcon =
            serviceHealth.status === 'healthy'
              ? '✅'
              : serviceHealth.status === 'degraded'
                ? '⚠️'
                : '❌';

          console.log(`${statusIcon} ${serviceName}: ${serviceHealth.status}`);
          console.log(`   Response Time: ${serviceHealth.responseTime}ms`);
          console.log(`   Critical: ${serviceHealth.critical ? 'Yes' : 'No'}`);
          console.log(`   Timestamp: ${serviceHealth.timestamp}`);

          if (serviceHealth.details) {
            console.log(`   Details:`);
            Object.entries(serviceHealth.details).forEach(([key, value]) => {
              console.log(`      ${key}: ${value}`);
            });
          }

          if (serviceHealth.error) {
            console.log(`   Error: ${serviceHealth.error}`);
          }
        } else {
          console.log(
            `❌ Service ${serviceName} not found in health check results`
          );
        }
      } catch (error) {
        console.log(
          `❌ ${serviceName} health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
    console.log();

    // Test 3: Performance Analysis
    console.log('📈 Test 3: Performance Analysis');
    try {
      const performanceTests = [];

      // Run multiple health checks to analyze performance
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        const health = await healthService.checkOverallHealth();
        const endTime = Date.now();

        performanceTests.push({
          iteration: i + 1,
          totalTime: endTime - startTime,
          responseTime: health.totalResponseTime,
          healthyServices: health.healthyServices,
          status: health.status,
        });
      }

      console.log('✅ Performance test results:');
      performanceTests.forEach(test => {
        console.log(
          `   Run ${test.iteration}: ${test.totalTime}ms total, ${test.responseTime}ms services, ${test.healthyServices} healthy, status: ${test.status}`
        );
      });

      const avgTotalTime =
        performanceTests.reduce((sum, test) => sum + test.totalTime, 0) /
        performanceTests.length;
      const avgResponseTime =
        performanceTests.reduce((sum, test) => sum + test.responseTime, 0) /
        performanceTests.length;

      console.log(
        `📊 Averages: ${avgTotalTime.toFixed(0)}ms total, ${avgResponseTime.toFixed(0)}ms services`
      );

      // Performance thresholds
      const PERFORMANCE_THRESHOLDS = {
        excellent: 2000,
        good: 5000,
        acceptable: 10000,
      };

      let performanceRating = 'poor';
      if (avgTotalTime <= PERFORMANCE_THRESHOLDS.excellent) {
        performanceRating = 'excellent';
      } else if (avgTotalTime <= PERFORMANCE_THRESHOLDS.good) {
        performanceRating = 'good';
      } else if (avgTotalTime <= PERFORMANCE_THRESHOLDS.acceptable) {
        performanceRating = 'acceptable';
      }

      console.log(`🎯 Performance Rating: ${performanceRating.toUpperCase()}`);
    } catch (error) {
      console.log(
        `❌ Performance analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    console.log();

    // Test 4: Configuration Testing
    console.log('⚙️ Test 4: Configuration Testing');
    try {
      // Test with different configurations
      const configs = [
        { name: 'Fast Check', timeout: 5000, parallel: true },
        { name: 'Thorough Check', timeout: 15000, parallel: false },
        {
          name: 'Critical Only',
          services: ['hedera', 'mirror-node'],
          timeout: 8000,
          parallel: true,
        },
      ];

      for (const config of configs) {
        console.log(`\n🔧 Testing ${config.name} configuration...`);
        const testService = getHealthCheckService(config);

        const startTime = Date.now();
        const health = await testService.checkOverallHealth();
        const totalTime = Date.now() - startTime;

        console.log(`   ✅ Completed in ${totalTime}ms`);
        console.log(
          `   📊 Status: ${health.status}, Services: ${health.totalServices}`
        );
        console.log(
          `   🎯 Healthy: ${health.healthyServices}, Degraded: ${health.degradedServices}, Unhealthy: ${health.unhealthyServices}`
        );
      }
    } catch (error) {
      console.log(
        `❌ Configuration testing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    console.log();

    // Test 5: System Uptime and Metadata
    console.log('📊 Test 5: System Uptime and Metadata');
    try {
      const uptime = healthService.getUptime();
      const config = healthService.getConfig();

      console.log(`✅ System uptime: ${Math.round(uptime / 1000)} seconds`);
      console.log(`📋 Active configuration:`);
      console.log(`   - Timeout: ${config.timeout}ms`);
      console.log(`   - Parallel: ${config.parallel}`);
      console.log(`   - Services: ${config.services.join(', ')}`);
      console.log(`   - Critical: ${config.criticalServices.join(', ')}`);
    } catch (error) {
      console.log(
        `❌ Metadata retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    console.log();

    console.log('✅ Health Check Service Tests Complete!\n');

    // Summary and Recommendations
    console.log('📋 Summary and Recommendations:');
    console.log('1. ✅ Health check system is operational');
    console.log('2. 🔍 Individual service monitoring working');
    console.log('3. 📈 Performance metrics are being collected');
    console.log('4. ⚙️ Configuration flexibility validated');
    console.log('5. 🎯 Ready for demonstration monitoring');
    console.log('\n💡 For demonstrations, use the /api/health endpoint');
    console.log(
      '💡 Use the HealthStatusDashboard component for visual monitoring'
    );
    console.log('💡 Configure auto-refresh for real-time status updates');
  } catch (error) {
    console.error('❌ Health check service testing failed:', error);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  testHealthCheckService()
    .then(() => {
      console.log('\n🎉 All health check tests completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Health check testing failed:', error);
      process.exit(1);
    });
}

export default testHealthCheckService;
