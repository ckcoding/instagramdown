const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const Agent = require('socks5-https-client/lib/Agent')
const app = express()
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())
//代理，根据自己实际需求填写。
var agency = {
    socksHost: '127.0.0.1',
    socksPort: 7891
}

async function run(url,cookie){
    var headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_1_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
        'cookie': cookie
    }
    try {
        if (url.indexOf('instagram.com/s') >= 0) {
             var options = {
                url: url,
                agentClass: Agent,
                agentOptions: agency,
                'headers': headers
            };
            let p = new Promise(function (resolve, reject) {
                request.get(options, (req, res) => {
                    resolve(res)
                })
            }).then(function (res) {

                var urls = res.request.uri.href
                var options ={
                    url: urls,
                    agentClass: Agent,
                    agentOptions: agency,
                    'headers': headers
                }
                return  new Promise(function (resolve, reject) {
                        request.get(options, (req, res) => {
                            var reb = {
                                res:res,
                                urls:urls
                            }
                            resolve(reb)
                        })
                    })}).then(function(reb){
                    var res =reb.res
                   var urls = reb.urls

                       var html =res.body

                       return new Promise(function (resolve, reject) {

                         if (urls.indexOf('stories/highlights') >= 0){
                    var reg = /(?<=\/stories\/highlights\/)([\s\S]*?)(?=\/)/
                    var id ='highlight:'+html.match(reg)[0]
                }else{
                    var reg = /(?<=\[{"user":{"id":")([\s\S]*?)(?=","profile_pic_url")/
                    var id = html.match(reg)[0]
                   
                }
                      // console.log(id);

                        var options = {
                            url: `https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=${id}`,
                            agentClass: Agent,
                            agentOptions: agency,
                            'headers': {
                                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_1_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36',
                                'cookie': cookie,
                                'x-ig-app-id': '936619743392459'
                            }
                        }

                        request.get(options, (req, res) => {
                            console.log(id);
                            var reb = {
                                res:res,
                                id:id
                            }
                            resolve(reb)

                        })

                    })
                }

                ).then(function (reb) {
                   var res =reb.res
                   console.log(res.body);
                   
                   var id = reb.id
                    var list = JSON.parse(res.body).reels[id].items
                    var images = []
                    console.log('开始');
                    for (var i = 0; i < list.length; i++) {
                        
                        if (list[i].video_versions) {
                            var img = list[i].video_versions[0].url

                            images.push({ img: img })

                        } else {
                            var img = list[i].image_versions2.candidates[0].url

                            images.push({ img: img })
                        }


                    }

                    console.log(images);

                    return { code: 200, data: { images: images } }
                })
                return await p
        }else {
           
            
            var options = {
                url: url,
                agentClass: Agent,
                agentOptions: agency,
                'headers': headers
            };

            let p = new Promise(function (resolve, reject) {
                request.get(options, (req, res) => {
                    resolve(res)

                })

            })
                .then(function (res) {
                    var html = res.body
                   console.log(html);
                   
                    var reg = /(?<={"graphql":)([\s\S]*?)(?=\);<\/script>)/
                    //视频
                    //console.log(JSON.parse('{"graphql":'+html.match(reg)[0].replace('\u0026', '&')));

                    var videourl = JSON.parse('{"graphql":' + html.match(reg)[0].replace('\u0026', '&')).graphql.shortcode_media
                    if (videourl.video_url) return { code: 200, data: { url: videourl.video_url } }
                    //判断是一张图片还是多张图片
                    var urllists = JSON.parse('{"graphql":' + html.match(reg)[0].replace('\u0026', '&')).graphql.shortcode_media

                    if (urllists.edge_sidecar_to_children === undefined) {
                        var imgurl = urllists.display_url
                        return { code: 200, data: { images: [{ img: imgurl }] } }
                    }






                    //多张图片



                    var urllist = JSON.parse('{"graphql":' + html.match(reg)[0].replace('\u0026', '&')).graphql.shortcode_media.edge_sidecar_to_children.edges

                    //判断是否存在多个视频，dash_info

                    console.log(urllist);

                    var images = []
                    console.log(urllist.length);

                    for (var i = 0; i < urllist.length; i++) {
                        //判断是否存在多个视频，dash_info
                        if (urllist[i].node.video_url) {
                            var imgs = urllist[i].node.video_url
                            images.push({ img: imgs })

                        } else {
                            var imgs = urllist[i].node.display_resources
                            var imgl = imgs.length
                            images.push({ img: imgs[imgl - 1].src })
                        }



                    }
                    console.log(images);
                    return { code: 200, data: { images: images } }
                })

                return await p
        }

    } catch {
        return { code: 400, msg: '解析异常，请重试，如果依旧存在这个问题，请向我们反馈异常，ins由于环境特殊需要代理，解析失败属于正常现象，过会儿试就好了，一次不行多试几次即OK' }
    }
}
app.get('/',async (req, res) => {res.send({code:400,msg:'请使用Post访问!'})})
app.post('/',async (req, res) => {
    //console.log("urls"+JSON.stringify(req))
    var cookie = req.body.cookie
    var urls = req.body.url
    var r = /https?:\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/
    if (!urls) res.send({code:400,msg:'大哥，你tm简直糊整，是这样用的,请传入url链接'})
    if(!urls.match(r)) res.send({code:400,msg:'你的链接有误，请检查链接是否正确或者是否包含 # & 等这样的特殊字符，如果有，请先过滤这些特殊字符'})
    var url = urls.match(r)[0];
    res.send(await run(url,cookie))
   
})
const port = process.env.PORT || 3333
app.listen(port, () => {
    console.log(port, '端口已开启')
})
