# langrissar-server


npm run typeorm migration:create src/migrations/CreateUsersTable
npm run typeorm migration:run




# 运行日志管理工具
1.首先在服务器上创建必要的目录：
mkdir -p /data/langrissar/logs
mkdir -p /data/langrissar/goaccess
chmod 777 /data/langrissar/logs
chmod 777 /data/langrissar/goaccess

2.拉取 GoAccess 镜像：
docker pull allinurl/goaccess:latest

3.停止并删除已存在的 GoAccess 容器（如果有）：
docker stop goaccess
docker rm goaccess

4.运行 GoAccess 容器：
docker run -d \
  --name goaccess \
  -p 7890:7890 \
  -v /data/langrissar/logs:/srv/logs:ro \
  -v /data/langrissar/goaccess:/srv/report:rw \
  allinurl/goaccess \
  --log-format='%dT%t.%^ %^: %m %U' \
  --date-format='%Y-%m-%d' \
  --time-format='%H:%M:%S' \
  --real-time-html \
  --port=7890 \
  --log-file=/srv/logs/app-2025-05-19.log \
  --output=/srv/report/report.html \
  --no-global-config \
  --no-ip-validation